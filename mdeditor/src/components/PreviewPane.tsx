import React from 'react';
// プレビューロジックを担うコンポーネント。
/**
 * プレビューペインコンポーネント (Right Panel)
 * @param {Object} props - コンプロパティ定義
 * @param {DocumentState | null} props.document - 現在編集中のドキュメントの状態（Source of Truthから取得）
 */
const PreviewPane: React.FC<{ document: DocumentState | null }> = ({ 
    document 
}) => {

  // NOTE: ここで実際にMarkdownをHTMLに変換するロジックと、LaTeXレンダリングを行うWeb Worker/Thread通信が必要です。
  
  const renderPreviewContent = (content: string) => {
    if (!content) {
      return <div className="placeholder">プレビューを表示するにはエディタに入力してください。</div>;
    }

    // ★★★ 性能最適化ポイント ★★★
    // 実際には、この関数内で非同期処理（Web Worker/Thread）を呼び出し、
    // 結果が返ってきたときにReact Stateを更新して再描画させる必要があります。
    
    // ここでは単純なMarkdown to HTML変換のモックとします。
    const mockHtml = content.replace(/#\s+/, '<h1>') // # Header -> <h1>
                                .replace(/\n/g, '<br/>'); // 改行を<br/>に置換

    return (
      <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: mockHtml }} />
    );
  };

  return (
    <div className="preview-pane">
      <h2>👁️ プレビュー</h2>
      {renderPreviewContent(document?.content || '')}
    </div>
  );
};

export default PreviewPane;