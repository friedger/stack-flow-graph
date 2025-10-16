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

    // Create simulation data
    const simulationNodes = nodes.map(node => ({
      ...node,
      currentBalance: balancesAtTime.get(node.id) || 0,
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200
    }));

    const simulationLinks = links.map(link => ({
      source: link.source,
      target: link.target,
      value: link.value
    }));

    // Create stable positions in a circle layout
    const angleStep = (2 * Math.PI) / simulationNodes.length;
    const radius = Math.min(width, height) * 0.35;
    simulationNodes.forEach((node: any, i: number) => {
      const angle = i * angleStep;
      node.fx = width / 2 + radius * Math.cos(angle);
      node.fy = height / 2 + radius * Math.sin(angle);
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

    // Draw nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(simulationNodes)
      .join('circle')
      .attr('class', 'node')
      .attr('r', (d: any) => {
        const balance = Math.abs(d.currentBalance);
        return Math.max(20, Math.min(80, Math.sqrt(balance) / 100));
      })
      .attr('fill', (d: any) => {
        return d.currentBalance > 0 
          ? 'hsl(var(--primary))' 
          : 'hsl(var(--node-inactive))';
      })
      .attr('stroke', 'hsl(var(--primary-glow))')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // Add address labels (above nodes)
    const addressLabels = g.append('g')
      .selectAll('text.address-label')
      .data(simulationNodes)
      .join('text')
      .attr('class', 'address-label')
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => {
        const balance = Math.abs(d.currentBalance);
        const radius = Math.max(20, Math.min(80, Math.sqrt(balance) / 100));
        return -radius - 5;
      })
      .attr('fill', 'hsl(var(--primary))')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text((d: any) => d.id.substring(0, 5));

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

    node
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

    // Position elements initially
    link
      .attr('x1', (d: any) => d.source.fx)
      .attr('y1', (d: any) => d.source.fy)
      .attr('x2', (d: any) => d.target.fx)
      .attr('y2', (d: any) => d.target.fy);

    node
      .attr('cx', (d: any) => d.fx)
      .attr('cy', (d: any) => d.fy);

    addressLabels
      .attr('x', (d: any) => d.fx)
      .attr('y', (d: any) => d.fy);

    balanceLabels
      .attr('x', (d: any) => d.fx)
      .attr('y', (d: any) => d.fy);

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
