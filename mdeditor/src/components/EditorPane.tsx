import React, { useCallback, useEffect, useState } from 'react';
// 外部ライブラリとしてCodeMirrorやMonaco Editorを使用することを想定
// 現状ではシンプルなtextareaでモックアップし、将来的な置き換えを容易にする構造とする。

/**
 * エディタペインコンポーネント (Left Panel)
 * @param {Object} props - コンプロパティ定義
 * @param {DocumentState | null} props.document - 現在編集中のドキュメントの状態（Source of Truthから取得）
 * @param {(content: string) => void} props.onContentChange - 内容変更時のコールバック関数。ストアの更新をトリガーする。
 */
const EditorPane: React.FC<{ document: DocumentState | null; onContentChange: (newContent: string) => void }> = ({ 
    document, 
    onContentChange 
}) => {
  // エディタの状態管理は内部で行い、変更を外部ストアに通知する。
  const [localContent, setLocalContent] = useState(document?.content || '');

  // Props (document) の変更に応じてローカル状態をリセット/初期化する。
  useEffect(() => {
    if (document && document.content !== localContent) {
      setLocalContent(document.content);
    } else if (!document) {
      setLocalContent('');
    }
  }, [document]);


  // テキスト入力ハンドラ：Debouncing/Throttlingのロジックをここに組み込む。
  const handleEditorChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;

    // ★★★ 性能最適化ポイント ★★★
    // 実際のコードでは、ここで Debounce/Throttle (例: useDebounce hook) を使用し、
    // 定期的に onContentChange(newContent) が呼ばれるように制御する必要があります。
    // 例: setTimeout(onContentChange, 100);

    setLocalContent(newContent); // ローカルな即時反映のための状態更新（あくまでUX向け）
    onContentChange(newContent); // ストアへの変更通知（遅延させるべき箇所）
  }, [onContentChange]);


  return (
    <div className="editor-pane">
      <h2>📄 エディタ</h2>
      {/* 実際の開発では、この <textarea> を CodeMirror / Monaco Editor のコンポーネントに置き換える */}
      <textarea
        className="markdown-editor"
        value={localContent}
        onChange={handleEditorChange}
        placeholder="ここにMarkdownを記述してください..."
        // 高度なエディタの機能（シンタックスハイライト、カスタム装飾）がここで適用される。
        style={{ width: '100%', height: 'calc(100vh - 100px)', border: 'none', resize: 'none' }}
      />
    </div>
  );
};

export default EditorPane;