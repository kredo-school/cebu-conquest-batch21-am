# Cebu Conquest - フロントエンド修正指示書

## 目的
Cebu ConquestのWeek 5統合テストで検出されたUIデザイン・レイアウトの不具合（Error No.1, 5, 6）を修正し、アプリケーション全体で視覚的な統一感を持たせ、ユーザビリティを向上させる。

## 前提条件
- 「神の選択ビューの修正と同期」に関する実装は完了済みのため、対象ファイル（GodSelectionView等）のロジックやレイアウトは変更しないこと。
- スタイルにはTailwind CSS（Reactコンポーネント内）および標準CSS（ロビー画面用）を使用する。

## 修正タスク一覧

### タスク 1: 共通ボタンコンポーネントの作成と適用 (対応: Error No.5)
各ページでばらばらになっているボタンのデザイン（字体、丸みなど）を統一する。

**【実装指示】**
1. `src/components/common/CustomButton.tsx` を新規作成し、以下の要件を満たす共通コンポーネントを実装する。
   - すべてのボタンに `rounded-full`, `font-bold`, `transition-all` を適用する。
   - `variant` プロップスを受け取り、`primary` (オレンジ系), `danger` (赤系), `ghost` (アウトラインのみ) のスタイルを切り替えられるようにする。
2. アプリケーション内のすべての独立した `<button>` タグを検索し、作成した `<CustomButton>` に置き換える。

**【コード例】**
```tsx
import React from 'react';

interface Props {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'danger' | 'ghost';
  disabled?: boolean;
  className?: string;
}

export const CustomButton: React.FC<Props> = ({ onClick, children, variant = 'primary', disabled, className = '' }) => {
  const baseStyle = "px-6 py-2 rounded-full font-bold transition-all duration-200 transform active:scale-95";
  const variants = {
    primary: "bg-orange-500 text-white hover:bg-orange-600 shadow-lg",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "border-2 border-orange-500 text-orange-500 hover:bg-orange-50"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};
タスク 2: グローバルナビゲーションの作成と適用 (対応: Error No.1)
各ページごとに作成されていたNavbarを廃止し、専用ファイルで統一する。ロゴは太字で字間を詰めたデザインとする。

【実装指示】

src/components/layout/GlobalNavbar.tsx を新規作成する。

以下の要件でスタイリングする。

ロゴ部分（CEBU CONQUEST）: font-black, tracking-tighter（字間を詰める）, text-orange-600

全体: sticky top-0, 背景色白で少し透過させる。

各ページコンポーネント（Login, Register, Lobbyなど）にハードコードされている既存のナビゲーションヘッダーを削除し、この GlobalNavbar を配置する（または共通レイアウトコンポーネントに組み込む）。

【コード例】

TypeScript
import React from 'react';
import { useNavigate } from 'react-router-dom';

export const GlobalNavbar: React.FC = () => {
  const navigate = useNavigate();
  return (
    <nav className="w-full py-4 px-8 flex justify-between items-center bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
      <div 
        className="text-2xl font-black tracking-tighter text-orange-600 cursor-pointer uppercase"
        onClick={() => navigate('/')}
      >
        CEBU CONQUEST
      </div>
      {/* 必要に応じて右側のメニューリンクを追加 */}
    </nav>
  );
};
タスク 3: ロビー画面のレイアウト修正 (対応: Error No.6)
ロビー画面（Lobby）の縦幅が大きすぎてスクロールが必要になっている問題を解決し、1画面（ビューポート内）に収める。

【実装指示】

Lobbyコンポーネントの親コンテナのCSS（またはTailwindクラス）を修正する。

親コンテナを h-screen (または height: 100vh), flex, flex-col, overflow-hidden に設定し、画面全体でのスクロールを禁止する。

チャット履歴の表示エリアやプレイヤーリストのエリアに対して flex-1, overflow-y-auto を適用し、必要な内部エリアだけがスクロールするように修正する。

【コード例（Tailwindを使用する場合のイメージ）】

TypeScript
// src/views/LobbyView.tsx (該当部分の修正)
<div className="h-screen flex flex-col overflow-hidden bg-gray-50">
  <GlobalNavbar />
  <div className="flex-1 flex overflow-hidden p-4">
    {/* プレイヤーリストや設定エリア */}
    <div className="w-1/3 overflow-y-auto pr-4">...</div>
    
    {/* チャットエリア */}
    <div className="flex-1 flex flex-col bg-white rounded-xl shadow">
      <div className="flex-1 overflow-y-auto p-4">
        {/* メッセージ一覧 */}
      </div>
      <div className="p-4 border-t">
        {/* チャット入力欄 */}
      </div>
    </div>
  </div>
</div>
注意事項
コンポーネントを差し替える際、既存の onClick イベントやステート管理へのバインディングが外れないよう細心の注意を払うこと。

作業完了後、必ずローカルで画面遷移とレイアウト崩れがないか確認すること。


---
この内容でAntigravityに渡せば、迷うことなく意図した通りのリファクタリングを行ってくれるはずです！