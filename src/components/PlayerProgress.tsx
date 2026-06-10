import { useGameStore } from '@/store/useGameStore'
import { getRatingDimensionLabel } from '@/data/gameData'
import { Star, TrendingUp, AlertTriangle, Heart, RotateCcw, Award, TrendingDown } from 'lucide-react'

export default function PlayerProgress() {
  const player = useGameStore(s => s.player)
  const businessRating = useGameStore(s => s.businessRating)
  const resetGame = useGameStore(s => s.resetGame)

  const expPercent = (player.exp / 100) * 100

  const renderStars = (count: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClass = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            className={`${sizeClass} ${i <= count ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} transition-all duration-300`}
          />
        ))}
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    if (score >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  const getStarColor = (stars: number) => {
    if (stars >= 4) return 'from-green-500 to-emerald-400'
    if (stars >= 3) return 'from-yellow-500 to-amber-400'
    if (stars >= 2) return 'from-orange-500 to-orange-400'
    return 'from-red-500 to-red-400'
  }

  const dimensionIcons: Record<string, string> = {
    cureRate: '💚',
    netIncome: '💰',
    equipmentIntegrity: '⚙️',
    avgTreatmentCost: '💊',
    accidentCount: '⚠️',
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs tracking-widest text-gray-400 uppercase">
          星际兽医档案
        </h3>
        <button
          onClick={resetGame}
          className="text-gray-600 hover:text-gray-400 transition-colors"
          title="重置游戏"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-yellow-400" />
          <span className="font-display text-sm text-yellow-300">Lv.{player.level}</span>
          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${expPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500">{player.exp}/100</span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">⬡</span>
          <span className="font-display text-xl text-cyan-300 coin-display">{player.coins}</span>
          <span className="text-xs text-gray-500">星币</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-green-900/20 rounded-lg p-2 text-center border border-green-800/20">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Heart className="w-3 h-3 text-green-400" />
              <span className="text-[10px] text-green-500">治愈</span>
            </div>
            <span className="font-display text-base text-green-300">{player.cured}</span>
          </div>
          <div className="bg-red-900/20 rounded-lg p-2 text-center border border-red-800/20">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span className="text-[10px] text-red-500">误诊</span>
            </div>
            <span className="font-display text-base text-red-300">{player.misdiagnosed}</span>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 bg-gray-900/40 rounded p-1.5">
          <TrendingUp className="w-3 h-3 text-cyan-500" />
          <span className="text-[10px] text-gray-400">累计收入</span>
          <span className="text-xs text-cyan-400 ml-auto">{player.totalIncome} ⬡</span>
        </div>
      </div>

      <div className="border-t border-gray-800/50 pt-3">
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-4 h-4 text-yellow-400" />
          <h3 className="font-display text-xs tracking-widest text-gray-400 uppercase">
            经营评分
          </h3>
        </div>

        <div className={`bg-gradient-to-br ${getStarColor(businessRating.stars)} bg-opacity-10 rounded-lg p-3 border border-yellow-700/30`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-300">综合评级</span>
            <span className={`font-display text-lg bg-gradient-to-r ${getStarColor(businessRating.stars)} bg-clip-text text-transparent`}>
              {businessRating.score} 分
            </span>
          </div>
          <div className="flex justify-center mb-2">
            {renderStars(businessRating.stars, 'lg')}
          </div>

          {businessRating.stars >= 4 && (
            <div className="text-[10px] text-center text-green-400 bg-green-900/30 rounded py-1 px-2">
              ✨ 四星以上：治疗奖励 +25%
            </div>
          )}
          {businessRating.stars <= 2 && (
            <div className="text-[10px] text-center text-red-400 bg-red-900/30 rounded py-1 px-2">
              ⚠️ 二星以下：高紧急病例概率提升
            </div>
          )}
          {businessRating.stars === 3 && (
            <div className="text-[10px] text-center text-gray-500 bg-gray-900/30 rounded py-1 px-2">
              评级正常
            </div>
          )}
        </div>

        <div className="mt-3 space-y-1.5">
          {(Object.keys(businessRating.scores) as Array<keyof typeof businessRating.scores>).map(key => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs">{dimensionIcons[key] || '📊'}</span>
              <span className="text-[10px] text-gray-400 w-16 flex-shrink-0">
                {getRatingDimensionLabel(key)}
              </span>
              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getScoreColor(businessRating.scores[key]).replace('text-', 'bg-')}`}
                  style={{ width: `${businessRating.scores[key]}%` }}
                />
              </div>
              <span className={`text-[10px] font-mono w-8 text-right ${getScoreColor(businessRating.scores[key])}`}>
                {businessRating.scores[key]}
              </span>
            </div>
          ))}
        </div>

        {businessRating.recentChanges.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-700/30">
            <div className="flex items-center gap-1.5 mb-2">
              {businessRating.recentChanges[0].delta > 0 ? (
                <TrendingUp className="w-3 h-3 text-green-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
              <span className="text-[10px] text-gray-400">最近变化</span>
            </div>
            <div className="space-y-1">
              {businessRating.recentChanges.slice(0, 3).map(change => (
                <div
                  key={change.id}
                  className="flex items-center gap-2 text-[10px] bg-gray-900/40 rounded px-2 py-1"
                >
                  <span className="text-gray-500">{dimensionIcons[change.dimension] || '📊'}</span>
                  <span className="text-gray-400 flex-1 truncate">{change.reason}</span>
                  <span className={change.delta > 0 ? 'text-green-400' : 'text-red-400'}>
                    {change.delta > 0 ? '+' : ''}{change.delta}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
