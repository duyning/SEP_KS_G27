// Missing/deleted targets remain attached to the root. Never lose a reply.
export function commentTree(replies) {
  const nodes = new Map(replies.map(reply => [reply.id, { ...reply, children: [] }]));
  const roots = [];
  for (const node of nodes.values()) {
    let parent = nodes.get(node.replyToId);
    const seen = new Set([node.id]);
    let cursor = parent;
    while (cursor) {
      if (seen.has(cursor.id)) { parent = null; break; }
      seen.add(cursor.id);
      cursor = nodes.get(cursor.replyToId);
    }
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export async function loadReplyThread(api, postId, rootId, signal) {
  const first = await api.replies(postId, rootId, 0, signal);
  const content = [...first.content];
  let latest = first;
  for (let page = 1; page < first.totalPages; page++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    latest = await api.replies(postId, rootId, page, signal);
    content.push(...latest.content);
  }
  return { ...first, content, commentCount: latest.commentCount };
}
