function exportDebugJSON() {
    const debugData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        labels: window.labels,
        nodes: nodes.map(n => ({
            id: n.id,
            type: n.type,
            ioScope: n.ioScope,
            x: n.x,
            y: n.y,
            width: n.width,
            height: n.height,
            settings: n.settings,
        })),
        connections: connections.map(c => ({
            fromNodeId: c.fromNodeId,
            toNodeId: c.toNodeId,
        })),
    };
    const jsonStr = JSON.stringify(debugData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sfm_debug_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
