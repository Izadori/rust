/**
 * @module useDocumentStore
 * @description アプリケーション全体のドキュメント状態（Source of Truth）を一元管理するストア。
 * 複数のオープンファイルや現在の編集状態を管理し、データ永続化のロジックを持つ。
 */

import { useState, useCallback } from 'react';
// NOTE: 実際のTauriプロジェクトでは @tauri-apps/api を使用してFSアクセスを行う必要があります。
// ここでは概念的なインターフェースとして定義します。
// import { readTextFile, writeTextFile } from '@tauri-apps/api/fs';

/**
 * ドキュメントの型定義
 */
export interface DocumentState {
  uuid: string;          // 一意な識別子 (UUID)
  filePath: string | null; // ファイルシステム上の絶対パス
  content: string;       // 現在の編集内容 (Source of Truth)
  isDirty: boolean;      // 変更が加えられて未保存かどうかのフラグ
}

/**
 * ドキュメントストアフック：アプリケーション全体のドキュメント状態を管理する。
 * @returns {object} state, actions を含むオブジェクト
 */
export const useDocumentStore = () => {
  const [documents, setDocuments] = useState<Map<string, DocumentState>>(new Map());
  const [activeUuid, setActiveUuid] = useState<string | null>(null);

  // --- 初期化とアクティブドキュメント設定 ---

  /**
   * 新しいドキュメントをストアに追加する。
   * @param uuid - ユニークID
   * @param initialContent - 初期内容
   * @param filePath - ファイルパス (初期はnullでも可)
   */
  const addDocument = useCallback((uuid: string, initialContent: string, filePath: string | null): void => {
    setDocuments(prevDocs => new Map(
      [...prevDocs, [uuid, { 
        uuid, 
        filePath, 
        content: initialContent, 
        isDirty: false 
      ]]]
    ));
    if (!activeUuid) {
        setActiveUuid(uuid); // 新規追加時は自動でアクティブにする
    }
  }, [activeUuid]);

  /**
   * アクティブなドキュメントIDを設定する。
   * @param uuid - 設定する新しいUUID
   */
  const setActiveDocument = useCallback((uuid: string | null): void => {
    setActiveUuid(uuid);
  };


  // --- コンテンツ更新と永続化 ---

  /**
   * ドキュメントのコンテンツを更新し、Dirtyフラグを立てる。
   * @param uuid - 更新対象のUUID
   * @param newContent - 新しい内容
   */
  const updateDocumentContent = useCallback((uuid: string, newContent: string): void => {
    setDocuments(prevDocs => {
      const doc = prevDocs.get(uuid);
      if (!doc) return prevDocs;

      // 内容が変更されたらDirtyフラグを立てる
      const newState = { 
        ...doc, 
        content: newContent, 
        isDirty: true 
      };
      return new Map(Array.from(prevDocs).map(([key, value]) => key === uuid ? [key, newState] : [key, value]));
    });
  }, []);


  /**
   * アクティブなドキュメントをディスクに保存する (I/O操作の抽象化)。
   * @returns {Promise<boolean>} 保存が成功したか否か。
   */
  const saveActiveDocument = useCallback(async (): Promise<boolean> => {
    if (!activeUuid) return false;

    const currentDoc = documents.get(activeUuid);
    if (!currentDoc || !currentDoc.filePath) {
      console.warn("保存対象のファイルパスが設定されていません。");
      return false;
    }

    // TODO: ここにTauri APIを使用した実際の非同期ファイル書き込みロジックを記述する
    /* 
    try {
        await writeTextFile(currentDoc.filePath, currentDoc.content);
        console.log(`[FS] ${currentDoc.filePath} を正常に保存しました。`);
        // 保存成功後、Dirtyフラグをリセットする
        setDocuments(prevDocs => {
            const updatedMap = new Map(Array.from(prevDocs));
            updatedMap.set(activeUuid, { ...updatedMap.get(activeUuid)! , isDirty: false });
            return updatedMap;
        });
        return true;

    } catch (error) {
        console.error("[FS] ファイル保存エラーが発生しました:", error);
        // エラー発生時、ステートは変更しない
        return false;
    } 
    */
    
    console.log(`[Mock Save Success]: ${currentDoc.filePath} の内容をシミュレート保存しました。`);
    setDocuments(prevDocs => {
        const updatedMap = new Map(Array.from(prevDocs));
        updatedMap.set(activeUuid, { ...updatedMap.get(activeUuid)! , isDirty: false });
        return updatedMap;
    });
    return true;

  }, [activeUuid, documents]);


  // --- 状態のgetter ---
  const getActiveDocument = useCallback(() => {
    if (!activeUuid) return null;
    return documents.get(activeUuid);
  }, [documents, activeUuid]);


  return {
    documents,
    activeUuid,
    addDocument,
    setActiveDocument,
    updateDocumentContent,
    saveActiveDocument,
    getActiveDocument,
  };
};

/**
 * 【利用例】メインコンポーネント内で useDocumentStore() を呼び出して使用する。
 */