import { useEffect, useLayoutEffect, useRef } from 'react';
import { EditorContent, Extension, useEditor, useEditorState } from '@tiptap/react';
import { Plugin } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import { FontSize, TextStyle } from '@tiptap/extension-text-style';
import { Bold, Italic, List, ListOrdered, RemoveFormatting, Underline } from 'lucide-react';
import {
  cleanPostDocument, postContentLimit, postDocumentText, postFontSizes, readPostDocument, serializePostFormat,
} from '../services/community-text-format.js';

export function GrowingPostTextarea({ value, style, ...props }) {
  const field = useRef(null);
  useLayoutEffect(() => {
    const element = field.current;
    const resize = () => {
      element.style.height = 'auto';
      const { borderTopWidth, borderBottomWidth } = getComputedStyle(element);
      element.style.height = `${element.scrollHeight + parseFloat(borderTopWidth) + parseFloat(borderBottomWidth)}px`;
    };
    resize();
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (width === element.clientWidth) return;
      width = element.clientWidth;
      resize();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [value, style]);

  return <textarea {...props} ref={field} value={value} style={style} />;
}

const controls = [
  ['bold', 'In đậm', Bold, 'toggleBold'],
  ['italic', 'In nghiêng', Italic, 'toggleItalic'],
  ['underline', 'Gạch chân', Underline, 'toggleUnderline'],
  ['bulletList', 'Danh sách dấu đầu dòng', List, 'toggleBulletList'],
  ['orderedList', 'Danh sách đánh số', ListOrdered, 'toggleOrderedList'],
];

const ContentLimit = Extension.create({
  name: 'communityContentLimit',
  addProseMirrorPlugins() {
    return [new Plugin({
      filterTransaction(transaction) {
        if (!transaction.docChanged) return true;
        try {
          const doc = cleanPostDocument(transaction.doc.toJSON());
          return postDocumentText(doc).length <= postContentLimit;
        } catch {
          return false;
        }
      },
    })];
  },
});

const extensions = [
  StarterKit.configure({ blockquote: false, code: false, codeBlock: false, heading: false,
    horizontalRule: false, link: false, strike: false }),
  TextStyle,
  FontSize,
  ContentLimit,
];

export default function CommunityPostEditor({ id, value, format, onChange, disabled, invalid, placeholder }) {
  const initial = useRef(null);
  if (!initial.current) initial.current = readPostDocument(value, format);
  const editor = useEditor({
    extensions,
    content: initial.current,
    onUpdate: ({ editor }) => {
      const doc = cleanPostDocument(editor.getJSON());
      onChange(postDocumentText(doc), serializePostFormat(doc));
    },
  });
  const attributes = {
    id,
    role: 'textbox',
    class: 'community-growing-content community-rich-text',
    'aria-labelledby': 'post-content-label',
    'aria-describedby': 'post-content-help content-error contentFormat-error',
    'aria-multiline': 'true',
    'aria-required': 'true',
    'aria-invalid': String(invalid),
    'data-placeholder': placeholder,
  };
  useEffect(() => {
    editor?.setEditable(!disabled, false);
    editor?.setOptions({ editorProps: { attributes } });
  }, [editor, disabled, id, invalid, placeholder]);

  const selection = useEditorState({
    editor,
    selector: ({ editor }) => editor ? {
      hasTextSelection: !editor.state.selection.empty,
      active: controls.map(([type]) => editor.isActive(type)),
    } : null,
  });

  function changeSize(event) {
    const size = postFontSizes[event.target.value];
    const command = editor.chain().focus();
    if (size) command.setFontSize(size).run();
    else command.unsetFontSize().run();
  }

  return <div className="community-content-editor">
    <div className="community-format-controls" role="group" aria-label="Định dạng nội dung đã chọn">
      <select aria-label="Cỡ chữ nội dung" disabled={!selection?.hasTextSelection} value="" onChange={changeSize}>
        <option value="" disabled>Cỡ chữ</option>
        <option value="small">Nhỏ</option>
        <option value="normal">Vừa</option>
        <option value="large">Lớn</option>
      </select>
      {controls.map(([type, label, Icon, command], index) => <button key={type} type="button" title={label} aria-label={label}
        disabled={!editor || (index < 3 && !selection?.hasTextSelection)}
        aria-pressed={Boolean(selection?.active[index])} onMouseDown={event => event.preventDefault()}
        onClick={() => editor.chain().focus()[command]().run()}><Icon size={17} aria-hidden="true" /></button>)}
      <button type="button" title="Xóa định dạng chữ đã chọn" aria-label="Xóa định dạng chữ đã chọn"
        disabled={!selection?.hasTextSelection} onMouseDown={event => event.preventDefault()}
        onClick={() => editor.chain().focus().unsetAllMarks().run()}>
        <RemoveFormatting size={17} aria-hidden="true" />
      </button>
    </div>
    <EditorContent editor={editor} className={value ? '' : 'community-editor-empty'} />
  </div>;
}
