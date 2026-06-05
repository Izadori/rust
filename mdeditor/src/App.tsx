import React, { useState } from 'react';
import EditorPane from './components/EditorPane';
import PreviewPane from './components/PreviewPane';
// ステート管理フックのインポート
import { useDocumentStore } from '../state/useDocumentStore';

/**
 * メインアプリケーションコンポーネント。レイアウトと状態ストアを統合する役割を持つ。
 */
const App: React.FC = () => {
  // ストアから現在のドキュメントの状態を取得
  const { getActiveDocument, saveActiveDocument } = useDocumentStore();
  const activeDoc = getActiveDocument();

  // 仮想的なハンドルイベント：このハンドラ内でストアの更新と永続化ロジックを制御する。
  const handleSave = async () => {
    if (!activeDoc) return alert("保存するドキュメントがありません。");
    
    console.log("--- [Saving Document] ---");
    const success = await saveActiveDocument();

    if (success) {
      alert("ファイルを正常に保存しました！(Mock)");
    } else {
      alert("ファイルの保存中にエラーが発生しました。(Mock)");
    }
  };

  // TODO: 実際のアプリケーションでは、このコンポーネントのライフサイクル（unmount時）で未保存変更がないかチェックし、強制終了を防ぐ必要があります。

  return (
    <div className="mdeditor-container">
      {/* メニューバー（ファイル操作など） */}
      <header className="menu-bar">
        <h1>mdeditor</h1>
        <div>
          <button onClick={() => alert('Open File Dialog triggered.')}>開く</button>
          <button onClick={handleSave} disabled={!activeDoc?.isDirty}>保存</button>
        </div>
      </header>

      {/* 二分割レイアウト */}
      <div className="editor-content">
        {/* 左ペイン: エディタ */}
        <EditorPane 
          document={activeDoc} 
// ... (rest of App.tsx)

    // 仮想的なハンドルイベント：このハンドラ内でストアの更新と永続化ロジックを制御する。
    const handleSave = async () => {
        if (!activeDoc) return alert("保存するドキュメントがありません。");
        
        console.log("--- [Saving Document] ---");
        // TODO: 実際のAPIコールに置き換える必要がある
        await new Promise(resolve => setTimeout(() => resolve(true), 500)); // モック遅延と成功
    
        alert("ファイルを正常に保存しました！(Mock)");
    };

    // ★★★ 【改善点】Debouncing Hookを導入し、入力イベントの過剰な発火を防ぐ ★★★
    const useDebounceCallback = useCallback((callback: (content: string) => void, delayMs: number) => {
        return useCallback((...args: any[]) => {
            let timeoutId: NodeJS.Timeout;
            // クリーンアップ関数（今回はApp側で管理されるため、内部では使用せず、コールバックを返す形にする）
            const debouncedFunc = (...a: any[]) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    callback(...a);
                }, delayMs);
            };
            return debouncedFunc;
        }, [callback, delayMs]);
    }, []);

    // デバウンスされたコンテンツハンドラを生成 (300ms)
    const debouncedOnContentChange = useDebounceCallback(
        (newContent: string) => {
            if (!activeDoc) return;
            console.log("✅ [State Update] Debounce完了: Contentをストアに適用し、Dirtyフラグを立てます。");
            // ★★★ 実際のロジック：useDocumentStore().updateDocumentContent(newContent); を呼び出し、状態更新トリガーを行うべき ★★★
        }, 300
    );

    return (
        <div className="mdeditor-container">
            {/* メニューバー（ファイル操作など） */}
            <header className="menu-bar">
                <h1>mdeditor</h1>
                <div style={{ display: 'flex' }}>
                    <button onClick={() => alert('Open File Dialog triggered.')}>開く</button>
                    {/* handleSaveを直接使用する */}
                    <button onClick={handleSave} disabled={!activeDoc?.isDirty}>保存</button>
                </div>
            </header>

            {/* 二分割レイアウト */}
            <div className="editor-content">
                {/* 左ペイン: エディタ */}
                <EditorPane 
                    document={activeDoc} 
                    // ★★★ ここにデバウンスされたハンドラを渡す ★★★
                    onContentChange={(newContent) => {
                        debouncedOnContentChange(newContent);
                    }}
                />

                {/* 右ペイン: プレビュー */}
                <PreviewPane document={activeDoc} />
            </div>
        </div>
    );
};
        />

        {/* 右ペイン: プレビュー */}
        <PreviewPane document={activeDoc} />
      </div>
    </div>
  );
};

export default App;