import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function WorkflowGraph({ steps }) {
  const { nodes, edges } = useMemo(() => {
    const initialNodes = [
      {
        id: 'user',
        position: { x: 250, y: 0 },
        data: { label: '👤 User Prompt' },
        style: { background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '10px' }
      },
      {
        id: 'supervisor',
        position: { x: 250, y: 80 },
        data: { label: '🧠 Controller (Supervisor)' },
        style: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold' }
      }
    ];

    const initialEdges = [
      { id: 'e-user-sup', source: 'user', target: 'supervisor', animated: true, markerEnd: { type: MarkerType.ArrowClosed } }
    ];

    let currentNodes = [...initialNodes];
    let currentEdges = [...initialEdges];

    steps.forEach((step, index) => {
      const nodeId = `step-${index}`;
      
      // Alternate left/right for better layout
      const xPos = index % 2 === 0 ? 100 : 400;
      const yPos = 160 + (index * 80);

      currentNodes.push({
        id: nodeId,
        position: { x: xPos, y: yPos },
        data: { label: `🤖 ${step.tool}` },
        style: { background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' }
      });

      // Connect Supervisor to Tool
      currentEdges.push({
        id: `e-sup-${nodeId}`,
        source: 'supervisor',
        target: nodeId,
        animated: true,
        label: `Step ${index + 1}`,
        style: { stroke: '#94a3b8' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
      });
    });

    return { nodes: currentNodes, edges: currentEdges };
  }, [steps]);

  return (
    <div style={{ height: '400px', width: '100%', background: '#0f172a', borderRadius: '16px', overflow: 'hidden', border: '1px solid #334155' }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background color="#334155" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
