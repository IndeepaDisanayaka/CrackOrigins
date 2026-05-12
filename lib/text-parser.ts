/**
 * Utility to parse HTML content from contentEditable into structured data
 * to avoid saving raw HTML in the database.
 */

export interface TextStyle {
    type: string;
    from: number;
    to: number;
}

export interface StructuredParagraph {
    text: string;
    Typography: TextStyle[];
}

export function parseHtmlToStructured(html: string): StructuredParagraph {
    if (typeof document === 'undefined') return { text: html, Typography: [] };

    const container = document.createElement('div');
    container.innerHTML = html;
    
    let text = "";
    const Typography: TextStyle[] = [];
    
    function traverse(node: Node) {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent || "";
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const start = text.length;
            
            let styleType = "";
            const tag = el.tagName.toLowerCase();
            
            // Professional style names
            if (tag === 'b' || tag === 'strong') styleType = 'font-weight-bold';
            else if (tag === 'i' || tag === 'em') styleType = 'font-style-italic';
            else if (tag === 'u') styleType = 'text-decoration-underline';
            else if (tag === 'strike') styleType = 'text-decoration-strike';
            else if (tag === 'mark') styleType = 'font-background-yellow';
            
            el.childNodes.forEach(traverse);
            
            if (styleType && text.length > start) {
                Typography.push({ 
                    type: styleType, 
                    from: start, 
                    to: text.length 
                });
            }
        }
    }
    
    container.childNodes.forEach(traverse);
    return { text, Typography };
}

/**
 * Reconstructs HTML from structured data for the editor
 */
export function structuredToHtml(structured: StructuredParagraph): string {
    const { text, Typography } = structured;
    if (!Typography || Typography.length === 0) return text;

    // Sort Typography by start position, then by length (nested tags)
    const sortedStyles = [...Typography].sort((a, b) => a.from - b.from || b.to - a.to);
    
    let html = "";
    let lastIdx = 0;

    // This is a simplified version. For complex overlapping styles, 
    // a more robust tag nesting algorithm would be needed.
    // For now, we'll just handle basic non-overlapping or perfectly nested styles.
    
    // To keep it simple and safe for the user's request, we'll just return text 
    // if it's too complex, or use a basic insertion.
    
    // Better approach: use tags at specific indices
    const markers: { idx: number, type: 'open' | 'close', tag: string }[] = [];
    
    Typography.forEach(style => {
        let tag = 'span';
        if (style.type === 'font-weight-bold') tag = 'b';
        else if (style.type === 'font-style-italic') tag = 'i';
        else if (style.type === 'text-decoration-underline') tag = 'u';
        else if (style.type === 'text-decoration-strike') tag = 'strike';
        else if (style.type === 'font-background-yellow') tag = 'mark';

        markers.push({ idx: style.from, type: 'open', tag });
        markers.push({ idx: style.to, type: 'close', tag });
    });

    markers.sort((a, b) => a.idx - b.idx || (a.type === 'close' ? -1 : 1));

    let result = "";
    let currentIdx = 0;
    
    markers.forEach(marker => {
        result += text.substring(currentIdx, marker.idx);
        result += marker.type === 'open' ? `<${marker.tag}>` : `</${marker.tag}>`;
        currentIdx = marker.idx;
    });
    
    result += text.substring(currentIdx);
    return result;
}
