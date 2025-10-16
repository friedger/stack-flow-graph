import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { NetworkNode, NetworkLink, TimeSeriesBalance } from '@/utils/parseTransactions';

interface NetworkGraphProps {
  nodes: NetworkNode[];
  links: NetworkLink[];
  timeSeriesData: TimeSeriesBalance[];
  currentTimestamp: number;
}

export function NetworkGraph({ nodes, links, timeSeriesData, currentTimestamp }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    // Get balances at current timestamp
    const balancesAtTime = new Map<string, number>();
    
    // Find the latest balance for each address up to currentTimestamp
    timeSeriesData
      .filter(d => d.timestamp <= currentTimestamp)
      .forEach(d => {
        const existing = balancesAtTime.get(d.address);
        if (!existing || d.timestamp > existing) {
          balancesAtTime.set(d.address, d.balance);
        }
      });

    // Create simulation data and preserve user positions
    const simulationNodes = nodes.map(node => {
      const isContract = node.id.includes('.');
      const contractName = isContract ? node.id.split('.')[1] : '';
      
      return {
        ...node,
        currentBalance: balancesAtTime.get(node.id) || 0,
        isContract,
        contractName,
        x: width / 2 + (Math.random() - 0.5) * 200,
        y: height / 2 + (Math.random() - 0.5) * 200
      };
    });

    const simulationLinks = links.map(link => ({
      source: link.source,
      target: link.target,
      value: link.value
    }));

    // Create stable positions in a circle layout, but preserve user-adjusted positions
    const angleStep = (2 * Math.PI) / simulationNodes.length;
    const radius = Math.min(width, height) * 0.35;
    
    // Store reference to previous positions
    const prevPositions = new Map<string, {fx: number, fy: number}>();
    svg.selectAll('circle, rect').each(function(d: any) {
      if (d && d.id && d.fx !== undefined && d.fy !== undefined) {
        prevPositions.set(d.id, { fx: d.fx, fy: d.fy });
      }
    });
    
    simulationNodes.forEach((node: any, i: number) => {
      const prevPos = prevPositions.get(node.id);
      if (prevPos) {
        // Preserve user-adjusted position
        node.fx = prevPos.fx;
        node.fy = prevPos.fy;
      } else {
        // Set initial circular position
        const angle = i * angleStep;
        node.fx = width / 2 + radius * Math.cos(angle);
        node.fy = height / 2 + radius * Math.sin(angle);
      }
    });

    // Create force simulation with minimal movement
    const simulation = d3.forceSimulation(simulationNodes as any)
      .force('link', d3.forceLink(simulationLinks)
        .id((d: any) => d.id)
        .distance(150)
        .strength(0))
      .force('charge', d3.forceManyBody().strength(0))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0))
      .alpha(0)
      .alphaDecay(0)
      .stop();

    // Create container group
    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(simulationLinks)
      .join('line')
      .attr('class', 'link')
      .attr('stroke', 'hsl(var(--link-color))')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', (d: any) => Math.max(1, Math.log(d.value + 1)));

    // Draw nodes (circles for regular addresses, squares for contracts)
    const nodeGroup = g.append('g').attr('class', 'nodes');
    
    simulationNodes.forEach((d: any) => {
      const balance = Math.abs(d.currentBalance);
      const size = Math.max(20, Math.min(80, Math.sqrt(balance) / 100));
      
      if (d.isContract) {
        // Square for contracts
        nodeGroup.append('rect')
          .attr('class', 'node')
          .attr('width', size * 2)
          .attr('height', size * 2)
          .attr('x', d.fx - size)
          .attr('y', d.fy - size)
          .attr('fill', d.currentBalance > 0 ? 'hsl(var(--primary))' : 'hsl(var(--node-inactive))')
          .attr('stroke', 'hsl(var(--primary-glow))')
          .attr('stroke-width', 2)
          .style('cursor', 'grab')
          .datum(d)
          .call(d3.drag<any, any>()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended) as any);
      } else {
        // Circle for regular addresses
        nodeGroup.append('circle')
          .attr('class', 'node')
          .attr('r', size)
          .attr('cx', d.fx)
          .attr('cy', d.fy)
          .attr('fill', d.currentBalance > 0 ? 'hsl(var(--primary))' : 'hsl(var(--node-inactive))')
          .attr('stroke', 'hsl(var(--primary-glow))')
          .attr('stroke-width', 2)
          .style('cursor', 'grab')
          .datum(d)
          .call(d3.drag<any, any>()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended) as any);
      }
    });

    // Add address labels (above nodes) - showing first 5 chars and contract name if applicable
    const addressLabels = g.append('g')
      .selectAll('text.address-label')
      .data(simulationNodes)
      .join('text')
      .attr('class', 'address-label')
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => {
        const balance = Math.abs(d.currentBalance);
        const size = Math.max(20, Math.min(80, Math.sqrt(balance) / 100));
        return d.isContract ? -size - 20 : -size - 5;
      })
      .attr('fill', 'hsl(var(--primary))')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text((d: any) => {
        const prefix = d.id.substring(0, 5);
        return d.isContract ? `${prefix} (${d.contractName})` : prefix;
      });

    // Add balance labels (below nodes)
    const balanceLabels = g.append('g')
      .selectAll('text.balance-label')
      .data(simulationNodes)
      .join('text')
      .attr('class', 'balance-label')
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => {
        const balance = Math.abs(d.currentBalance);
        const radius = Math.max(20, Math.min(80, Math.sqrt(balance) / 100));
        return radius + 15;
      })
      .attr('fill', 'hsl(var(--foreground))')
      .attr('font-size', '11px')
      .attr('font-family', 'monospace')
      .text((d: any) => {
        const balance = d.currentBalance / 1000000;
        return `${balance.toFixed(1)}M STX`;
      });

    // Add tooltips
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'graph-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'hsl(var(--popover))')
      .style('border', '1px solid hsl(var(--border))')
      .style('padding', '12px')
      .style('border-radius', '8px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('box-shadow', 'var(--shadow-card)');

    g.selectAll('.node')
      .on('mouseover', function(event, d: any) {
        tooltip.style('visibility', 'visible')
          .html(`
            <div style="font-family: monospace;">
              <div style="font-weight: bold; margin-bottom: 8px; color: hsl(var(--primary));">
                ${d.id.substring(0, 8)}...${d.id.substring(d.id.length - 6)}
              </div>
              <div>Balance: ${(d.currentBalance / 1000000).toFixed(2)}M STX</div>
              <div>Received: ${(d.received / 1000000).toFixed(2)}M STX</div>
              <div>Sent: ${(d.sent / 1000000).toFixed(2)}M STX</div>
            </div>
          `);
        d3.select(this)
          .attr('stroke-width', 4)
          .attr('stroke', 'hsl(var(--accent))');
      })
      .on('mousemove', function(event) {
        tooltip
          .style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function() {
        tooltip.style('visibility', 'hidden');
        d3.select(this)
          .attr('stroke-width', 2)
          .attr('stroke', 'hsl(var(--primary-glow))');
      });

    // Position links initially
    link
      .attr('x1', (d: any) => d.source.fx)
      .attr('y1', (d: any) => d.source.fy)
      .attr('x2', (d: any) => d.target.fx)
      .attr('y2', (d: any) => d.target.fy);

    // Drag functions
    function dragstarted(event: any, d: any) {
      d3.select(event.sourceEvent.target).style('cursor', 'grabbing');
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
      
      const balance = Math.abs(d.currentBalance);
      const size = Math.max(20, Math.min(80, Math.sqrt(balance) / 100));
      
      // Update node position
      g.selectAll('circle.node')
        .filter((circleD: any) => circleD.id === d.id)
        .attr('cx', d.fx)
        .attr('cy', d.fy);
      
      g.selectAll('rect.node')
        .filter((rectD: any) => rectD.id === d.id)
        .attr('x', d.fx - size)
        .attr('y', d.fy - size);
      
      // Update links
      link
        .attr('x1', (linkD: any) => linkD.source.fx)
        .attr('y1', (linkD: any) => linkD.source.fy)
        .attr('x2', (linkD: any) => linkD.target.fx)
        .attr('y2', (linkD: any) => linkD.target.fy);
      
      // Update labels
      addressLabels
        .filter((labelD: any) => labelD.id === d.id)
        .attr('x', d.fx)
        .attr('y', d.fy);
      
      balanceLabels
        .filter((labelD: any) => labelD.id === d.id)
        .attr('x', d.fx)
        .attr('y', d.fy);
    }

    function dragended(event: any) {
      d3.select(event.sourceEvent.target).style('cursor', 'grab');
    }

    return () => {
      tooltip.remove();
    };
  }, [nodes, links, timeSeriesData, currentTimestamp, dimensions]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ background: 'hsl(var(--background))' }}
    />
  );
}
