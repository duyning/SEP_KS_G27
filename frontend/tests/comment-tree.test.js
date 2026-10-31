import test from 'node:test';
import assert from 'node:assert/strict';
import { commentTree, loadReplyThread } from '../src/services/comment-tree.js';

test('reply C belongs under B, while direct replies stay under A', () => {
  const tree = commentTree([{ id: 2, replyToId: 1 }, { id: 3, replyToId: 2 }, { id: 4, replyToId: 1 }]);
  assert.deepEqual(tree.map(n => n.id), [2, 4]);
  assert.deepEqual(tree[0].children.map(n => n.id), [3]);
});
test('missing targets and cycles do not hide replies or recurse forever', () => {
  const tree = commentTree([{ id: 2, replyToId: 999 }, { id: 3, replyToId: 4 }, { id: 4, replyToId: 3 }]);
  assert.deepEqual(tree.map(n => n.id), [2, 3, 4]);
});
test('load all reply pages so a target on an earlier page remains the parent', async () => {
  const api = { replies: async (_post, _root, page) => ({ content: page ? [{ id: 3, replyToId: 2 }] : [{ id: 2, replyToId: 1 }], totalPages: 2, commentCount: 3 }) };
  const result = await loadReplyThread(api, 10, 1, new AbortController().signal);
  assert.equal(commentTree(result.content)[0].children[0].id, 3);
});
