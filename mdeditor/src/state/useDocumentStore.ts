import { useState, useCallback } from 'react';

// 型定義 (ここでは簡略化)
interface DocumentState {
    content: string;
    isDirty: boolean;
    uuid: string;
}

/**
 * アプリケーションの単一真実の情報源 (Single Source of Truth: SSOT) ストア。
 * 実際のアプリでは、このストアがRedux/Zustandなどのライブラリでラップされるべきです。
 */
const useDocumentStore = () => {
    // 初期状態（モック）
    const [document, setDocument] = useState<DocumentState>({
        content: '# Welcome to mdeditor\n\nMarkdownを編集してください。\\\[LAX/E=mc^2\\\]', // 初期コンテンツにLaTeXプレースホルダを含める
        isDirty: false,
        uuid: 'initial-doc-123'
    });

    /** ドキュメント状態全体を取得するゲッター */
    const getActiveDocument = useCallback((): DocumentState | null => {
        return document;
    }, [document]);

    /** コンテンツを更新し、Dirtyフラグを立てるセッター（外部からの変更通知用） */
    const updateDocumentContent = useCallback((newContent: string) => {
        setDocument(prevDoc => ({
            ...prevDoc, 
            content: newContent, 
            isDirty: true // コンテンツが変更されたため、dirtyをtrueにする
        }));
    }, []);

    /** アプリケーション終了時などに行われる永続化処理のモック */
    const saveActiveDocument = useCallback(async (): Promise<boolean> => {
        // ここに実際のAPI/ファイル書き出しロジックを記述する
        console.log(`[Store] Saving document ${document.uuid}...`);
        await new Promise(resolve => setTimeout(resolve, 300)); // モックI/O遅延
        return true; // 成功を返す
    }, [document.uuid]);

    return {
        getActiveDocument,
        updateDocumentContent,
        saveActiveDocument
    };
};

export default useDocumentStore;