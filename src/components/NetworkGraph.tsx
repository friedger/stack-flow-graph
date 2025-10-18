import {
  NetworkLink,
  NetworkNode,
  TimeSeries,
  Transaction
} from "@/utils/parseTransactions";
import { getBalancesForDay, getTransactionsForDay } from "@/utils/timeSeries";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

interface NetworkGraphProps {
  nodes: NetworkNode[];
  links: NetworkLink[];
  timeSeriesData: TimeSeries;
  transactions: Transaction[];
  dayGroups: number[];
  currentGroupIndex: number;
}

export function NetworkGraph({
  nodes,
  links,
  timeSeriesData,
  transactions,
  dayGroups,
  currentGroupIndex,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const prevGroupIndexRef = useRef<number>(currentGroupIndex);

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;

    // Use previous day's balances for initial node sizes (before animations apply)
    // For day 0, use current day's balances (no animation)
    const previousBalances = currentGroupIndex > 0 
      ? getBalancesForDay(dayGroups, currentGroupIndex - 1, timeSeriesData)
      : getBalancesForDay(dayGroups, currentGroupIndex, timeSeriesData);
    
    // Use current day's balances for node colors
    const currentBalances = getBalancesForDay(dayGroups, currentGroupIndex, timeSeriesData);
    
    console.log(
      "networkgraph",
      currentGroupIndex,
      dayGroups[currentGroupIndex] + 1
    );

    // Load saved positions from localStorage
    const savedPositions = localStorage.getItem("networkGraphPositions");
    const positionsMap = savedPositions ? JSON.parse(savedPositions) : {};

    // Create simulation data and preserve user positions
    const simulationNodes = nodes.map((node, i) => {
      const isContract = node.id.includes(".");
      const contractName = isContract ? node.id.split(".")[1] : "";

      // Try to use saved position, otherwise use circular layout
      const angleStep = (2 * Math.PI) / nodes.length;
      const radius = Math.min(width, height) * 0.35;
      const angle = i * angleStep;

      const savedPos = positionsMap[node.id];

      return {
        ...node,
        currentBalance: previousBalances.get(node.id) || 0,
        isContract,
        contractName,
        fx: savedPos?.x ?? width / 2 + radius * Math.cos(angle),
        fy: savedPos?.y ?? height / 2 + radius * Math.sin(angle),
      };
    });

    const simulationLinks = links.map((link) => ({
      source: link.source,
      target: link.target,
      value: link.value,
    }));

    // Create force simulation with minimal movement
    const simulation = d3
      .forceSimulation(simulationNodes as any)
      .force(
        "link",
        d3
          .forceLink(simulationLinks)
          .id((d: any) => d.id)
          .distance(150)
          .strength(0)
      )
      .force("charge", d3.forceManyBody().strength(0))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0))
      .alpha(0)
      .alphaDecay(0)
      .stop();

    // Create container group
    const g = svg.append("g");

    // Load saved zoom transform from localStorage
    const savedTransform = localStorage.getItem("networkGraphTransform");
    let initialTransform = d3.zoomIdentity;
    
    if (savedTransform) {
      const transform = JSON.parse(savedTransform);
      initialTransform = d3.zoomIdentity
        .translate(transform.x, transform.y)
        .scale(transform.k);
    }

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        
        // Save zoom transform to localStorage
        localStorage.setItem("networkGraphTransform", JSON.stringify({
          k: event.transform.k,
          x: event.transform.x,
          y: event.transform.y
        }));
      });

    svg.call(zoom as any);
    
    // Apply the initial/saved transform
    svg.call(zoom.transform as any, initialTransform);

    // Draw links
    const link = g
      .append("g")
      .selectAll("line")
      .data(simulationLinks)
      .join("line")
      .attr("class", "link")
      .attr("stroke", "hsl(var(--link-color))")
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", (d: any) => Math.max(1, Math.log(d.value + 1)));

    // Draw nodes (circles for regular addresses, squares for contracts)
    const nodeGroup = g.append("g").attr("class", "nodes");

    simulationNodes.forEach((d: any) => {
      const balance = Math.abs(d.currentBalance);
      const size = Math.max(20, Math.min(80, Math.sqrt(balance) / 100));
      
      // Use current day's balance for color determination
      const currentBalance = currentBalances.get(d.id) || 0;

      if (d.isContract) {
        // Square for contracts
        nodeGroup
          .append("rect")
          .attr("class", "node")
          .attr("width", size * 2)
          .attr("height", size * 2)
          .attr("x", d.fx - size)
          .attr("y", d.fy - size)
          .attr(
            "fill",
            currentBalance > 0
              ? "hsl(var(--primary))"
              : "hsl(var(--node-inactive))"
          )
          .attr("stroke", "hsl(var(--primary-glow))")
          .attr("stroke-width", 2)
          .style("cursor", "grab")
          .datum(d)
          .call(
            d3
              .drag<any, any>()
              .on("start", dragstarted)
              .on("drag", dragged)
              .on("end", dragended) as any
          );
      } else {
        // Circle for regular addresses
        nodeGroup
          .append("circle")
          .attr("class", "node")
          .attr("r", size)
          .attr("cx", d.fx)
          .attr("cy", d.fy)
          .attr(
            "fill",
            currentBalance > 0
              ? "hsl(var(--primary))"
              : "hsl(var(--node-inactive))"
          )
          .attr("stroke", "hsl(var(--primary-glow))")
          .attr("stroke-width", 2)
          .style("cursor", "grab")
          .datum(d)
          .call(
            d3
              .drag<any, any>()
              .on("start", dragstarted)
              .on("drag", dragged)
              .on("end", dragended) as any
          );
      }
    });

    // Add address labels (above nodes) - showing first 5 chars and contract name if applicable
    const addressLabels = g
      .append("g")
      .selectAll("text.address-label")
      .data(simulationNodes)
      .join("text")
      .attr("class", "address-label")
      .attr("x", (d: any) => d.fx)
      .attr("y", (d: any) => d.fy)
      .attr("text-anchor", "middle")
      .attr("dy", (d: any) => {
        const balance = Math.abs(d.currentBalance);
        const size = Math.max(20, Math.min(80, Math.sqrt(balance) / 100));
        return d.isContract ? -size - 20 : -size - 5;
      })
      .attr("fill", "hsl(var(--primary))")
      .attr("font-size", "10px")
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .text((d: any) => {
        const prefix = d.id.substring(0, 5);
        return d.isContract ? `${prefix} (${d.contractName})` : prefix;
      });

    // Add balance labels (below nodes)
    const balanceLabels = g
      .append("g")
      .selectAll("text.balance-label")
      .data(simulationNodes)
      .join("text")
      .attr("class", "balance-label")
      .attr("x", (d: any) => d.fx)
      .attr("y", (d: any) => d.fy)
      .attr("text-anchor", "middle")
      .attr("dy", (d: any) => {
        const balance = Math.abs(d.currentBalance);
        const radius = Math.max(20, Math.min(80, Math.sqrt(balance) / 100));
        return radius + 15;
      })
      .attr("fill", "hsl(var(--foreground))")
      .attr("font-size", "11px")
      .attr("font-family", "monospace")
      .text((d: any) => {
        const balance = d.currentBalance / 1000000;
        return `${balance.toFixed(1)}M STX`;
      });

    // Add tooltips
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "graph-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "hsl(var(--popover))")
      .style("border", "1px solid hsl(var(--border))")
      .style("padding", "12px")
      .style("border-radius", "8px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000")
      .style("box-shadow", "var(--shadow-card)");

    g.selectAll(".node")
      .on("mouseover", function (event, d: any) {
        tooltip.style("visibility", "visible").html(`
            <div style="font-family: monospace;">
              <div style="font-weight: bold; margin-bottom: 8px; color: hsl(var(--primary));">
                ${d.id.substring(0, 8)}...${d.id.substring(d.id.length - 6)}
              </div>
              <div>Balance: ${(d.currentBalance / 1000000).toFixed(
                2
              )}M STX</div>
              <div>Received: ${(d.received / 1000000).toFixed(2)}M STX</div>
              <div>Sent: ${(d.sent / 1000000).toFixed(2)}M STX</div>
            </div>
          `);
        d3.select(this)
          .attr("stroke-width", 4)
          .attr("stroke", "hsl(var(--accent))");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("top", event.pageY - 10 + "px")
          .style("left", event.pageX + 10 + "px");
      })
      .on("mouseout", function () {
        tooltip.style("visibility", "hidden");
        d3.select(this)
          .attr("stroke-width", 2)
          .attr("stroke", "hsl(var(--primary-glow))");
      });

    // Position links initially
    link
      .attr("x1", (d: any) => d.source.fx)
      .attr("y1", (d: any) => d.source.fy)
      .attr("x2", (d: any) => d.target.fx)
      .attr("y2", (d: any) => d.target.fy);

    // Drag functions
    function dragstarted(event: any, d: any) {
      d3.select(event.sourceEvent.target).style("cursor", "grabbing");
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;

      const balance = Math.abs(d.currentBalance);
      const size = Math.max(20, Math.min(80, Math.sqrt(balance) / 100));

      // Update node position
      g.selectAll("circle.node")
        .filter((circleD: any) => circleD.id === d.id)
        .attr("cx", d.fx)
        .attr("cy", d.fy);

      g.selectAll("rect.node")
        .filter((rectD: any) => rectD.id === d.id)
        .attr("x", d.fx - size)
        .attr("y", d.fy - size);

      // Update links
      link
        .attr("x1", (linkD: any) => linkD.source.fx)
        .attr("y1", (linkD: any) => linkD.source.fy)
        .attr("x2", (linkD: any) => linkD.target.fx)
        .attr("y2", (linkD: any) => linkD.target.fy);

      // Update labels
      addressLabels
        .filter((labelD: any) => labelD.id === d.id)
        .attr("x", d.fx)
        .attr("y", d.fy);

      balanceLabels
        .filter((labelD: any) => labelD.id === d.id)
        .attr("x", d.fx)
        .attr("y", d.fy);
    }

    function dragended(event: any, d: any) {
      d3.select(event.sourceEvent.target).style("cursor", "grab");

      // Save all node positions to localStorage
      const positions: Record<string, { x: number; y: number }> = {};
      simulationNodes.forEach((node: any) => {
        positions[node.id] = { x: node.fx, y: node.fy };
      });
      localStorage.setItem("networkGraphPositions", JSON.stringify(positions));
    }

    return () => {
      tooltip.remove();
    };
  }, [nodes, links, timeSeriesData, dimensions, currentGroupIndex]);

  // Animation effect for moving transaction particles - triggered only on day changes
  useEffect(() => {
    if (
      !svgRef.current ||
      dimensions.width === 0 ||
      nodes.length === 0 ||
      currentGroupIndex === 0 ||
      currentGroupIndex === prevGroupIndexRef.current
    ) {
      prevGroupIndexRef.current = currentGroupIndex;
      return;
    }

    const svg = d3.select(svgRef.current);
    const g = svg.select("g");

    console.log("Animating day:", {
      currentDayIndex: currentGroupIndex,
      previousDayIndex: prevGroupIndexRef.current,
    });

    // Load positions
    const savedPositions = localStorage.getItem("networkGraphPositions");
    const positionsMap = savedPositions ? JSON.parse(savedPositions) : {};

    // Get node positions
    const nodePositions = new Map<string, { x: number; y: number }>();
    nodes.forEach((node, i) => {
      const angleStep = (2 * Math.PI) / nodes.length;
      const radius = Math.min(dimensions.width, dimensions.height) * 0.35;
      const angle = i * angleStep;
      const savedPos = positionsMap[node.id];
      nodePositions.set(node.id, {
        x: savedPos?.x ?? dimensions.width / 2 + radius * Math.cos(angle),
        y: savedPos?.y ?? dimensions.height / 2 + radius * Math.sin(angle),
      });
    });

    const activeTransactions = getTransactionsForDay(
      dayGroups,
      currentGroupIndex,
      transactions
    );

    // Remove old particles
    g.selectAll(".transaction-particle").remove();

    // Create particles for active transactions
    const particleGroup = g.append("g").attr("class", "transaction-particles");

    // Particle animation duration (2 seconds)
    const particleAnimationDuration = 2000;

    let particlesCreated = 0;

    activeTransactions.forEach((tx) => {
      const sourcePos = nodePositions.get(tx.sender);
      const targetPos = nodePositions.get(tx.recipient);
      
      // Case 1: Both nodes are in the network
      if (sourcePos && targetPos) {
        createParticleAnimation(particleGroup, sourcePos, targetPos, tx.amount, particleAnimationDuration);
        animateNodeSize(g, tx.sender, -tx.amount, particleAnimationDuration, true); // Sender shrinks
        animateNodeSize(g, tx.recipient, tx.amount, particleAnimationDuration, false); // Receiver grows
        particlesCreated++;
      }
      // Case 2: Outgoing transaction (node → external)
      else if (sourcePos && !targetPos) {
        createOutgoingParticleAnimation(particleGroup, sourcePos, dimensions, tx.amount, particleAnimationDuration);
        animateNodeSize(g, tx.sender, -tx.amount, particleAnimationDuration, true); // Sender shrinks
        particlesCreated++;
      }
      // Case 3: Incoming transaction (external → node)
      else if (!sourcePos && targetPos) {
        createIncomingParticleAnimation(particleGroup, targetPos, dimensions, tx.amount, particleAnimationDuration);
        animateNodeSize(g, tx.recipient, tx.amount, particleAnimationDuration, false); // Receiver grows
        particlesCreated++;
      }
      // Case 4: Both external (skip)
      else {
        console.log("Skipping transaction between two external addresses:", tx);
        return;
      }
    });

    console.log(
      "Particles created:",
      particlesCreated,
      "for day index:",
      currentGroupIndex,
      activeTransactions.length
    );
    
    // Update the ref to track this day
    prevGroupIndexRef.current = currentGroupIndex;
  }, [
    nodes,
    transactions,
    dimensions,
    dayGroups,
    currentGroupIndex,
  ]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ background: "hsl(var(--background))" }}
    />
  );
}

function getParticleSize(amountInSTX: number) {
  const MIN_PARTICLE_SIZE = 3;
  const MAX_PARTICLE_SIZE = 20;
  const MIN_AMOUNT = 100;
  const MAX_AMOUNT = 100000000;
  const AMOUNT_FACTOR =
    (MAX_AMOUNT / (MAX_PARTICLE_SIZE - MIN_PARTICLE_SIZE)) ^ 2;
  const particleSize =
    amountInSTX < MIN_AMOUNT
      ? MIN_PARTICLE_SIZE
      : amountInSTX > MAX_AMOUNT
      ? MAX_PARTICLE_SIZE
      : Math.min(
          MAX_PARTICLE_SIZE,
          MIN_PARTICLE_SIZE + Math.sqrt(amountInSTX / AMOUNT_FACTOR)
        );
  return particleSize;
}

// Helper to create standard particle animation between two known nodes
function createParticleAnimation(
  particleGroup: any,
  sourcePos: {x: number, y: number},
  targetPos: {x: number, y: number},
  amount: number,
  duration: number
) {
  const particleSize = getParticleSize(amount);
  
  const particle = particleGroup
    .append("circle")
    .attr("class", "transaction-particle")
    .attr("cx", sourcePos.x)
    .attr("cy", sourcePos.y)
    .attr("r", particleSize)
    .attr("fill", "hsl(var(--accent))")
    .attr("stroke", "hsl(var(--accent-glow))")
    .attr("stroke-width", 1.5)
    .style("opacity", 0)
    .style("filter", "drop-shadow(0 0 4px hsl(var(--accent)))");

  particle
    .transition()
    .duration(100)
    .style("opacity", 0.8)
    .transition()
    .duration(duration - 200)
    .attr("cx", targetPos.x)
    .attr("cy", targetPos.y)
    .transition()
    .duration(100)
    .style("opacity", 0)
    .remove();
}

// Outgoing: node → external (particle moves outward and fades)
function createOutgoingParticleAnimation(
  particleGroup: any,
  sourcePos: {x: number, y: number},
  dimensions: {width: number, height: number},
  amount: number,
  duration: number
) {
  const particleSize = getParticleSize(amount);
  
  // Calculate direction: away from center of canvas
  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;
  const dx = sourcePos.x - centerX;
  const dy = sourcePos.y - centerY;
  const angle = Math.atan2(dy, dx);
  
  // Calculate exit point at edge of canvas
  const distance = Math.max(dimensions.width, dimensions.height) * 0.6;
  const exitX = sourcePos.x + Math.cos(angle) * distance;
  const exitY = sourcePos.y + Math.sin(angle) * distance;
  
  const particle = particleGroup
    .append("circle")
    .attr("class", "transaction-particle")
    .attr("cx", sourcePos.x)
    .attr("cy", sourcePos.y)
    .attr("r", particleSize)
    .attr("fill", "hsl(var(--accent))")
    .attr("stroke", "hsl(var(--accent-glow))")
    .attr("stroke-width", 1.5)
    .style("opacity", 0)
    .style("filter", "drop-shadow(0 0 4px hsl(var(--accent)))");

  // Fade in briefly, move outward while fading out
  particle
    .transition()
    .duration(100)
    .style("opacity", 0.8)
    .transition()
    .duration(duration - 100)
    .attr("cx", exitX)
    .attr("cy", exitY)
    .style("opacity", 0)
    .remove();
}

// Incoming: external → node (particle appears and moves inward)
function createIncomingParticleAnimation(
  particleGroup: any,
  targetPos: {x: number, y: number},
  dimensions: {width: number, height: number},
  amount: number,
  duration: number
) {
  const particleSize = getParticleSize(amount);
  
  // Calculate direction: from edge toward the target node
  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;
  const dx = targetPos.x - centerX;
  const dy = targetPos.y - centerY;
  const angle = Math.atan2(dy, dx);
  
  // Calculate entry point at edge of canvas
  const distance = Math.max(dimensions.width, dimensions.height) * 0.6;
  const entryX = targetPos.x + Math.cos(angle) * distance;
  const entryY = targetPos.y + Math.sin(angle) * distance;
  
  const particle = particleGroup
    .append("circle")
    .attr("class", "transaction-particle")
    .attr("cx", entryX)
    .attr("cy", entryY)
    .attr("r", particleSize)
    .attr("fill", "hsl(var(--accent))")
    .attr("stroke", "hsl(var(--accent-glow))")
    .attr("stroke-width", 1.5)
    .style("opacity", 0.2)
    .style("filter", "drop-shadow(0 0 4px hsl(var(--accent)))");

  // Move inward while fading in, then briefly fade out
  particle
    .transition()
    .duration(duration - 100)
    .attr("cx", targetPos.x)
    .attr("cy", targetPos.y)
    .style("opacity", 0.8)
    .transition()
    .duration(100)
    .style("opacity", 0)
    .remove();
}

// Animate node size change during transactions
function animateNodeSize(
  g: any,
  nodeId: string,
  amountChange: number,
  duration: number,
  isSending: boolean
) {
  // Get the node's current balance from its data
  const nodeElement = g.selectAll(".node").filter((d: any) => d.id === nodeId);
  if (nodeElement.empty()) return;

  const nodeData: any = nodeElement.datum();
  const currentBalance = Math.abs(nodeData.currentBalance);
  const newBalance = Math.abs(nodeData.currentBalance + amountChange);
  
  const currentSize = Math.max(20, Math.min(80, Math.sqrt(currentBalance) / 100));
  const newSize = Math.max(20, Math.min(80, Math.sqrt(newBalance) / 100));

  // Determine timing: sending shrinks in first 50%, receiving grows in last 50%
  const delay = isSending ? 0 : duration / 2;
  const animDuration = duration / 2;

  // Animate circles
  g.selectAll("circle.node")
    .filter((d: any) => d.id === nodeId)
    .transition()
    .delay(delay)
    .duration(animDuration)
    .attr("r", newSize);

  // Animate rectangles (contracts)
  g.selectAll("rect.node")
    .filter((d: any) => d.id === nodeId)
    .transition()
    .delay(delay)
    .duration(animDuration)
    .attr("width", newSize * 2)
    .attr("height", newSize * 2)
    .attr("x", (d: any) => d.fx - newSize)
    .attr("y", (d: any) => d.fy - newSize);

  // Animate address labels
  g.selectAll("text.address-label")
    .filter((d: any) => d.id === nodeId)
    .transition()
    .delay(delay)
    .duration(animDuration)
    .attr("dy", (d: any) => (d.isContract ? -newSize - 20 : -newSize - 5));

  // Animate balance labels
  g.selectAll("text.balance-label")
    .filter((d: any) => d.id === nodeId)
    .transition()
    .delay(delay)
    .duration(animDuration)
    .attr("dy", newSize + 15)
    .tween("text", function(d: any) {
      const i = d3.interpolate(currentBalance, newBalance);
      return function(t: number) {
        const balance = i(t) / 1000000;
        d3.select(this).text(`${balance.toFixed(1)}M STX`);
      };
    });

  // Update the node data
  nodeData.currentBalance = nodeData.currentBalance + amountChange;
}
