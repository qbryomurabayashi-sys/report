import React from 'react';

export const LogicExplanation: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-neutral-200">
        <h1 className="text-2xl font-bold text-neutral-900 mb-6 border-b pb-4">計算ロジック仕様書</h1>
        
        <div className="space-y-10">
          {/* 0. 休日・祝日の判定 */}
          <section>
            <h2 className="text-lg font-bold text-neutral-800 mb-3 flex items-center">
              <span className="bg-neutral-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">0</span>
              休日・祝日の判定
            </h2>
            <p className="text-sm text-neutral-600 mb-4 leading-relaxed">
              システムでは、土曜日・日曜日および「国民の祝日」を休日として扱います。祝日は日本の法律に基づき自動的に計算・適用されます。
            </p>
          </section>

          {/* 1. TREND予測 */}
          <section>
            <h2 className="text-lg font-bold text-neutral-800 mb-3 flex items-center">
              <span className="bg-neutral-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">1</span>
              TREND予測 (重回帰分析) & 曜日トレンド
            </h2>
            <p className="text-sm text-neutral-600 mb-4 leading-relaxed">
              過去の月別平均客数を目的変数とし、外部要因（広告費、競合フラグ）を説明変数とした重回帰分析を用いてベースとなる客数を予測します。さらに、曜日ごとの来客傾向（曜日指数）を算出し、日別の詳細な予測を行います。
            </p>
            <div className="bg-neutral-50 p-4 rounded-lg font-mono text-sm text-neutral-800 space-y-2">
              <div>Y ＝ β0 ＋ β1X1 ＋ β2X2</div>
              <div className="text-xs text-neutral-500">(Y: 予測ベース客数、X1: 広告費、X2: 競合フラグ、β: 偏回帰係数)</div>
              <div className="mt-2 pt-2 border-t border-neutral-200">曜日指数 ＝ (特定の曜日の平均客数) ÷ (全曜日の平均客数)</div>
              <div>日別予測 ＝ Y × 季節指数 × 曜日指数</div>
            </div>
            <p className="text-[10px] text-neutral-400 mt-2">※過去データ不足や多重共線性等で行列計算が不可能な場合は、単純な過去平均値をフォールバックとして使用します。</p>
          </section>

          {/* 2. FORECAST予測 */}
          <section>
            <h2 className="text-lg font-bold text-neutral-800 mb-3 flex items-center">
              <span className="bg-neutral-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">2</span>
              FORECAST予測 (時系列単回帰分析)
            </h2>
            <p className="text-sm text-neutral-600 mb-4 leading-relaxed">
              時間の経過（月数）を説明変数とし、過去の月別平均客数を目的変数とした単回帰分析を用いて、時間的トレンドに基づいたベース客数を予測します。
            </p>
            <div className="bg-neutral-50 p-4 rounded-lg font-mono text-sm text-neutral-800 space-y-2">
              <div>Y ＝ a ＋ b*t</div>
              <div className="text-xs text-neutral-500">(Y: 予測ベース客数、t: 基準月からの経過月数、a: 切片、b: 傾き)</div>
            </div>
          </section>

          {/* 3. 月間予算と1日あたりの客数予測 */}
          <section>
            <h2 className="text-lg font-bold text-neutral-800 mb-3 flex items-center">
              <span className="bg-neutral-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">3</span>
              月間予算と1日あたりの客数予測（AIベース / 予算ベース）
            </h2>
            <p className="text-sm text-neutral-600 mb-4 leading-relaxed">
              稼働計画における予測客数は、予算の入力状況に応じて以下のいずれかで計算されます。
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-neutral-200 p-4 rounded-lg">
                <h3 className="text-sm font-bold mb-2 text-blue-600">【AIベース】 (予算未入力時)</h3>
                <p className="text-xs text-neutral-500">過去データから予測した1日あたりの平日/休日客数を使用し、月間予測客数を算出します。</p>
              </div>
              <div className="border border-neutral-200 p-4 rounded-lg">
                <h3 className="text-sm font-bold mb-2 text-emerald-600">【予算ベース】 (予算入力時)</h3>
                <p className="text-xs text-neutral-500 mb-3">入力された「月間予算(客数)」を、休日倍率(1.25)に合わせて日割り計算し、1日あたりの客数を逆算します。</p>
                <div className="bg-neutral-50 p-2 rounded font-mono text-[11px] space-y-1">
                  <div>総ウェイト ＝ 平日日数 ＋ (休日日数 × 1.25)</div>
                  <div>平日の予測客数 ＝ 月間予算 ÷ 総ウェイト</div>
                  <div>休日の予測客数 ＝ 平日の予測客数 × 1.25</div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. 季節指数 */}
          <section>
            <h2 className="text-lg font-bold text-neutral-800 mb-3 flex items-center">
              <span className="bg-neutral-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">4</span>
              季節指数 (AI予測時)
            </h2>
            <p className="text-sm text-neutral-600 mb-4 leading-relaxed">
              月ごとの客数の変動（季節性）を捉えるための指数です（平日/休日別）。
            </p>
            <div className="bg-neutral-50 p-4 rounded-lg font-mono text-sm text-neutral-800 space-y-2">
              <div>季節指数 ＝ (対象月の過去平均客数) ÷ (全期間の総平均客数)</div>
              <div>最終予測客数 ＝ ベース予測値 × 季節指数</div>
            </div>
          </section>

          {/* 5. 必要人員枠の計算 */}
          <section>
            <h2 className="text-lg font-bold text-neutral-800 mb-3 flex items-center">
              <span className="bg-neutral-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">5</span>
              必要人員枠の計算 (1日あたり)
            </h2>
            <p className="text-sm text-neutral-600 mb-4 leading-relaxed">
              算出された「1日あたりの予測客数」と、店舗の営業時間、規定の休憩時間（90分＝1.5時間）、および店舗の標準的な処理能力（マーク無：1時間あたり3.5人）に基づいて、1日あたりに必要な推奨スタッフ数を算出します。
            </p>
            <div className="bg-neutral-50 p-4 rounded-lg font-mono text-sm text-neutral-800 space-y-2 mb-4">
              <div>1人の実働時間 ＝ 営業時間 － 1.5時間</div>
              <div>標準的な1日処理能力 ＝ 1人の実働時間 × 3.5人/時</div>
              <div>必要数(理論値) ＝ 1日の予測客数 ÷ 標準的な1日処理能力</div>
            </div>
            <div className="bg-neutral-900 text-white p-4 rounded-lg">
              <h4 className="text-xs font-bold uppercase tracking-widest mb-2 opacity-70">最終必要数 制約</h4>
              <ul className="text-sm space-y-1 list-disc list-inside opacity-90">
                <li>最大値: 店舗の席数 (※計算上の上限値として機能)</li>
                <li>最小値(平日): 2</li>
                <li>最小値(休日): オープンから37ヶ月以内は3、それ以降は2</li>
              </ul>
            </div>
          </section>

          {/* 6. 人数と過不足 */}
          <section>
            <h2 className="text-lg font-bold text-neutral-800 mb-3 flex items-center">
              <span className="bg-neutral-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">6</span>
              人数（確保・必要）と過不足の計算
            </h2>
            <p className="text-sm text-neutral-600 mb-4 leading-relaxed">
              月間の総数として以下のロジックで計算されます。
            </p>
            <div className="bg-neutral-50 p-4 rounded-lg font-mono text-sm text-neutral-800 space-y-2">
              <div>確保数 ＝ (その月の日数) － (スタッフの公休数)</div>
              <div>必要数 ＝ (平日の必要人員 × 平日日数) ＋ (休日の必要人員 × 休日日数)</div>
              <div>合計供給力(1日) ＝ Σ(スタッフごとの個体能力)</div>
              <div>過不足 ＝ 確保数 － 計画計 (マイナスの場合はスタッフ枠の不足)</div>
              <div>応援必要数 (最終過不足) ＝ 過不足 ＋ 時短パートの合計日数</div>
            </div>
          </section>

          {/* 7. スタッフの個体能力 */}
          <section>
            <h2 className="text-lg font-bold text-neutral-800 mb-3 flex items-center">
              <span className="bg-neutral-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">7</span>
              スタッフの個体能力と供給力計算
            </h2>
            <p className="text-sm text-neutral-600 mb-4 leading-relaxed">
              出勤する各スタッフの1日あたりの処理能力（個体能力）は、実働時間（営業時間 － 1.5時間）に、付与されたマーク（スキルレベル）に応じた処理能力を掛け合わせて算出します。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded border border-blue-100">
                <div className="text-xs font-bold text-blue-600 mb-1">新人マーク</div>
                <div className="text-lg font-black text-blue-700">2.5 <span className="text-xs font-normal">人/時</span></div>
              </div>
              <div className="bg-neutral-50 p-3 rounded border border-neutral-200">
                <div className="text-xs font-bold text-neutral-600 mb-1">マーク無（標準）</div>
                <div className="text-lg font-black text-neutral-900">3.5 <span className="text-xs font-normal">人/時</span></div>
              </div>
              <div className="bg-emerald-50 p-3 rounded border border-emerald-100">
                <div className="text-xs font-bold text-emerald-600 mb-1">指導者マーク</div>
                <div className="text-lg font-black text-emerald-700">4.0 <span className="text-xs font-normal">人/時</span></div>
              </div>
            </div>
            <div className="bg-neutral-50 p-4 rounded-lg font-mono text-sm text-neutral-800">
              個体能力 ＝ 実働時間 × スキル別係数
            </div>
          </section>

          {/* 8. マイナス調整ロジック */}
          <section>
            <h2 className="text-lg font-bold text-neutral-800 mb-3 flex items-center">
              <span className="bg-neutral-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">8</span>
              マイナス調整ロジック (休業・休職)
            </h2>
            <p className="text-sm text-neutral-600 mb-4 leading-relaxed">
              標準的な計算から除外すべき日数を手動で調整できます。
            </p>
            <div className="bg-neutral-50 p-4 rounded-lg font-mono text-sm text-neutral-800 space-y-2">
              <div>有効稼働日数 ＝ カレンダー上の曜日数 － (店舗休業等の調整入力数)</div>
              <div>実質稼働可能日数 ＝ (月間日数) － (公休数) － (休職等調整数)</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
