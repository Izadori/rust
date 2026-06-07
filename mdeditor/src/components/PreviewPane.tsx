import React, { useState, useEffect, useCallback } from 'react';

// DocumentStateの型は外部で定義されているものと仮定し、今回はダミーで対応する
// 実際のプロジェクトでは、適切な型をインポートする必要があります。
type DocumentState = { content: string; /* ... other fields */ };

/**
 * プレビューペインコンポーネント (Right Panel) - 非同期レンダリングパイプラインの実装
 * @param {Object} props - コンプロパティ定義
 * @param {DocumentState | null} props.document - 現在編集中のドキュメントの状態（Source of Truthから取得）
 */
const PreviewPane: React.FC<{ document: DocumentState | null }> = ({ 
    document 
}) => {
  // ローカルなレンダリング状態 (非同期処理の結果を保持)
  const [renderedContent, setRenderedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * ★★★ シミュレーション: 非同期のMarkdownパーシング＆LaTeXレンダリングパイプライン ★★★
   * Web Worker/専用スレッドからの結果を待つ処理を模倣しています。
   */
  const processAndRender = useCallback(async (content: string) => {
    if (!content.trim()) {
      setRenderedContent(''); // 空の場合は即座にクリア
      setIsLoading(false); 
      return;
    }

    // 処理開始時に必ずisLoadingをtrueにし、内容表示エリアを初期化する
    setIsLoading(true);
    setRenderedContent('...'); 

    // 1. Rust/Backendシミュレーション（Web Worker呼び出しの模倣）
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 300)); // 遅延をシミュレート (300ms〜500ms)

    // --- レンダリングコアロジック（フロントエンド側での処理のモック）---
    let processedHtml = content;
    processedHtml = processedHtml.replace(/\[LAX\/(.*?)\]/g, (match, latexFormula) => {
        return `[[LAX_TOKEN:${latexFormula}]]`; 
    // ==========================================================================
    // [IPC CORE]: Tauri invoke/Web Worker通信の実装（非同期パイプライン）
    try {
        // ★★★ ここで非同期IPCコールを実行する想定のロジックブロック ★★★
        await new Promise<void>(resolve => setTimeout(() => { 
            // 擬似的なレンダリング結果 (本来は Rust から返却される最終HTML文字列)
            const mockLatexRender = 'Math: $\\sum_{i=1}^N i^2$';
            let finalHtmlMock = `<h1>Document Title</h1><p>This is a paragraph demonstrating markdown conversion. The formula was successfully rendered.</p><div class="math-rendered" data-formula="${mockLatexRender}">\\text{Rendered Math: ${mockLatexRender}}</div>`;
            
            // 最終的な結果をセットし、ロード状態を解除する。これが非同期コール成功のシミュレーション。
            setRenderedContent(finalHtmlMock);
            setIsLoading(false); 
            resolve(); // 成功したらPromiseを解決する
        }, 400)); // 400ms の非同期遅延をシミュレート

    } catch (error) {
        console.error("Rendering failed:", error);
        setRenderedContent('<p style="color:red;">レンダリングエラーが発生しました。</p>');
        setIsLoading(false);
    }
    // ==========================================================================


  }, []);

/**
 * 親コンポーネント (App.tsx) からプロパティが変更されたときに実行されるエフェクト。
 */
useEffect(() => {
  const content = document?.content;
  if (!content) {
    setRenderedContent(''); // 表示内容をクリアし、処理終了状態に置く
    setIsLoading(false);
    return; 
  }

  // コンテンツがある場合のみレンダリング処理を実行
  processAndRender(content); 
}, [document, processAndRender]); 

return (
  <div className="preview-pane">
    <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>👁️ プレビュー</h2>
    {/* Fallback/Loading UI のロジックを統合 */}
    {!isLoading && !document && (
      // ケース1: documentがnullまたはundefinedの場合の初期ガイドメッセージ (データソース未接続)
      <div className="initial-guide">
        <p>📄 ドキュメントの状態を待機中です...</p>
        <p style={{ fontSize: '0.9em', color: '#666' }}>左側のエディタにテキストを入力すると、プレビューが自動的に更新されます。</p>
      </div>
    )}

    {isLoading ? (
      // ケース2: 処理実行中
      <div className="loading-state">
        <p>⚡️レンダリング中... (Async Worker/Thread Processing)</p>
      </div>
    ) : document && !isLoading && renderedContent ? (
      // ケース3: 正常にコンテンツがレンダリングされた場合（最優先）
      <div 
        className="markdown-preview" 
        dangerouslySetInnerHTML={{ __html: renderedContent }} 
      />
    ) : document?.content === '' && !isLoading ? (
       // ケース4: コンテンツは存在するが空の場合 (データフローは正常だが内容がない)
      <div className="empty-state">
        <p>💡 空のドキュメントです。ここに内容が表示されます。</p>
      </div>
    ) : null // その他の未定義・予期せぬ状態は何も表示しない
  </div>
);