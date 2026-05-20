
/**
 * Helper to generate visual segments for the frontend
 * This is a client-side friendly utility (sync)
 */
export function getVisualDiffSegments(oldText: string, ops: any[]) {
    if (!Array.isArray(ops) || ops.length === 0) return [{ type: 'equal', text: String(oldText || "") }];

    const segments: any[] = [];
    let lastPos = 0;
    const oldStr = String(oldText || "");

    // Process ops in order of position
    const sortedOps = [...ops].sort((a, b) => {
        const posA = a.type === 'delete' ? a.from : a.at;
        const posB = b.type === 'delete' ? b.from : b.at;
        return posA - posB;
    });

    for (const op of sortedOps) {
        const pos = op.type === 'delete' ? op.from : op.at;

        // Add equal segment before this op
        if (pos > lastPos) {
            segments.push({ type: 'equal', text: oldStr.substring(lastPos, pos) });
        }

        segments.push(op);
        if (op.type === 'delete') {
            lastPos = op.to;
        } else {
            lastPos = op.at;
        }
    }

    // Add final equal segment
    if (lastPos < oldStr.length) {
        segments.push({ type: 'equal', text: oldStr.substring(lastPos) });
    }

    return segments;
}
