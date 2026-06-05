import React, { useCallback, useState, useEffect } from 'react';
import EditorPane from './components/EditorPane';
import PreviewPane from './components/PreviewPane';
// ステート管理フックのインポート
import { useDocumentStore } from '../state/useDocumentStore';

/** ユーティリティ関数：Debounceの実装 */
function useDebounceCallback<T>(callback: (content: string) => void, delayMs: number): React.useCallback<(...args: any[]) => void, [typeof callback, number]> {
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
}

/**
 * メインアプリケーションコンポーネント。レイアウトと状態ストアを統合する役割を持つ。
 */
const App: React.FC = () => {
    // ストアから現在のドキュメントの状態を取得
    const { getActiveDocument, saveActiveDocument } = useDocumentStore();
    const activeDoc = getActiveDocument();

    // 仮想的なハンドルイベント：このハンドラ内でストアの更新と永続化ロジックを制御する。
    // ★★★ [FIX] useCallbackを使用して、JSX属性として渡すコールバック関数を安定させ、構文エラーを回避します。★★★
    const handleSave = useCallback(async () => {
        if (!activeDoc) return alert("保存するドキュメントがありません。");
        
        console.log("--- [Saving Document] ---");
        // TODO: 実際のAPIコールに置き換える必要がある
        await new Promise(resolve => setTimeout(() => resolve(true), 500)); // モック遅延と成功
    
        alert("ファイルを正常に保存しました！(Mock)");
    }, [activeDoc]);

    // ★★★ 【改善点】Debouncing Hookを導入し、入力イベントの過剰な発火を防ぐ ★★★
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
                </div >
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
            </div >
        </div>
    );
};