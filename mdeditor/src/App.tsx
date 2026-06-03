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
          onContentChange={(newContent) => {
            // Storeの更新をトリガーし、Dirtyフラグを立てる
            // NOTE: ここでストアの updateDocumentContent を呼び出す必要があります。
            console.log("--- [Input Triggered] Content Change ---");
          }}
        />

        {/* 右ペイン: プレビュー */}
        <PreviewPane document={activeDoc} />
      </div>
    </div>
  );
};

export default App;