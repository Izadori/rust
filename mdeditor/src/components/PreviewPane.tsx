import React, { useState, useEffect, useCallback } from 'react';
// DocumentStateの型を再利用することを想定

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
   * これは本来、Web Worker/専用スレッドからの結果を待つ処理を模倣しています。
   */
  const processAndRender = useCallback(async (content: string) => {
    if (!content) {
      setRenderedContent('');
      return;
    }

    setIsLoading(true);
    setRenderedContent('...'); // ローディング表示

    // 1. Rust/Backendシミュレーション（Web Worker呼び出しの模倣）
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 300)); // 遅延をシミュレート (300ms〜500ms)

    // --- レンダリングコアロジック（フロントエンド側での処理のモック）---
    let processedHtml = content;

    // ステップ A: MarkdownパースとLaTeXプレースホルダ化
    processedHtml = processedHtml.replace(/\[LAX\/(.*?)\]/g, (match, latexFormula) => {
        // LaTeX記法を独自のトークンに変換し、パーサーが認識しやすいようにする（V3.0の要件）
        return `[[LAX_TOKEN:${latexFormula}]]`; 
    // ==========================================================================
    // [IPC CORE]: Tauri invoke/Web Worker通信の実装（非同期パイプライン）
    // 実際のアプリケーションでは、ここで tauri::api::invoke を使って Rust バックエンドを呼び出します。
    // 例：const result = await invoke('process_markdown', { content: content });
    // パフォーマンスと分離性を考慮し、ここでは async/await でシミュレーションを続けますが、最終的にはIPCに置き換えます。
    // --------------------------------------------------------------------------
    try {
        setIsLoading(true);
        setRenderedContent('...'); // ローディング表示

        // ★★★ ここで非同期IPCコールを実行する想定のロジックブロック ★★★
        await new Promise<void>((resolve) => setTimeout(() => {
            // 擬似的なレンダリング結果 (本来は Rust から返却される最終HTML文字列)
            const mockLatexRender = 'Math: $\\sum_{i=1}^N i^2$';
            let finalHtmlMock = `<h1>Document Title</h1><p>This is a paragraph demonstrating markdown conversion. The formula was successfully rendered.</p><div class="math-rendered" data-formula="${mockLatexRender}">\\text{Rendered Math: ${mockLatexRender}}</div>`;
            
            setRenderedContent(finalHtmlMock);
            setIsLoading(false);
            resolve();
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
    if (content) {
        processAndRender(content);
    } else {
        setRenderedContent('');
        setIsLoading(false);
    }
  }, [document]); // documentが変わるたびにレンダリングを試みる

  return (
    <div className="preview-pane">
      <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>👁️ プレビュー</h2>
      {isLoading ? (
        <div className="loading-state">
            <p>⚡️レンダリング中... (Async Worker/Thread Processing)</p>
        </div>
      ) : (
        <div 
            className="markdown-preview" 
            dangerouslySetInnerHTML={{ __html: renderedContent }} 
        />
      )}
    </div>
  );
};

export default PreviewPane;