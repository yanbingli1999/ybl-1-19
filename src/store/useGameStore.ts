import { create } from 'zustand'
import {
  type PetCase,
  type Player,
  type Equipment,
  type GamePhase,
  type DiagnosisResult,
  type ActionType,
  type AccidentType,
  type BusinessRating,
  type RatingChange,
  initialEquipment,
  generatePetCase,
  generateInitialCases,
  generateTestCases,
  getDisease,
  getMedicine,
  calculateBusinessRating,
  calculateRatingScores,
  createRatingChange,
} from '@/data/gameData'

interface GameState {
  cases: PetCase[]
  activeCaseId: string | null
  player: Player
  equipment: Equipment[]
  gamePhase: GamePhase
  accidentType: AccidentType | null
  diagnosisResult: DiagnosisResult | null
  actionCooldowns: Record<ActionType, number>
  selectedMedicineId: string | null
  showMedicineSelector: boolean
  pendingAction: 'medicate' | 'inject' | 'feed' | null
  businessRating: BusinessRating

  selectCase: (id: string) => void
  examine: () => void
  medicate: () => void
  inject: () => void
  feed: () => void
  isolate: () => void
  selectMedicine: (id: string) => void
  cancelMedicineSelect: () => void
  performTreatment: (action: ActionType, medicineId?: string | null) => void
  repairEquipment: (id: string) => void
  dismissResult: () => void
  dismissAccident: () => void
  generateNewCase: () => void
  loadTestCases: () => void
  resetGame: () => void
  addRatingChange: (change: RatingChange) => void
  refreshRating: () => void
}

const initialPlayer: Player = {
  coins: 200,
  level: 1,
  exp: 0,
  cured: 0,
  misdiagnosed: 0,
  totalIncome: 0,
  totalMedicineCost: 0,
}

const initialRating: BusinessRating = {
  stars: 3,
  score: 70,
  scores: {
    cureRate: 70,
    netIncome: 70,
    equipmentIntegrity: 100,
    avgTreatmentCost: 70,
    accidentCount: 100,
  },
  recentChanges: [],
}

const expPerLevel = 100

function getCoinsForUrgency(urgency: PetCase['urgency']): number {
  switch (urgency) {
    case 'low': return 30
    case 'medium': return 50
    case 'high': return 80
  }
}

function getRewardMultiplier(stars: number): number {
  if (stars >= 4) return 1.25
  return 1
}

function generatePetCaseWithRating(stars: number): PetCase {
  const baseCase = generatePetCase()
  if (stars <= 2) {
    const rand = Math.random()
    if (rand < 0.5) {
      return { ...baseCase, urgency: 'high' }
    }
  }
  return baseCase
}

function getPenaltyForAccident(urgency: PetCase['urgency']): number {
  switch (urgency) {
    case 'low': return 20
    case 'medium': return 35
    case 'high': return 60
  }
}

function getActionLabel(action: ActionType): string {
  switch (action) {
    case 'examine': return '检查'
    case 'medicate': return '用药'
    case 'inject': return '打针'
    case 'feed': return '喂食'
    case 'isolate': return '隔离'
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  cases: generateInitialCases(5),
  activeCaseId: null,
  player: { ...initialPlayer },
  equipment: initialEquipment.map(e => ({ ...e })),
  gamePhase: 'idle',
  accidentType: null,
  diagnosisResult: null,
  actionCooldowns: {
    examine: 0,
    medicate: 0,
    inject: 0,
    feed: 0,
    isolate: 0,
  },
  selectedMedicineId: null,
  showMedicineSelector: false,
  pendingAction: null,
  businessRating: { ...initialRating, scores: { ...initialRating.scores }, recentChanges: [] },

  addRatingChange: (change: RatingChange) => {
    const state = get()
    const recentChanges = [change, ...state.businessRating.recentChanges].slice(0, 5)
    const newRating = calculateBusinessRating(state.player, state.equipment, recentChanges)
    set({ businessRating: newRating })
  },

  refreshRating: () => {
    const state = get()
    const newRating = calculateBusinessRating(state.player, state.equipment, state.businessRating.recentChanges)
    set({ businessRating: newRating })
  },

  selectCase: (id: string) => {
    const state = get()
    if (state.gamePhase === 'accident' || state.gamePhase === 'result') return
    set({
      activeCaseId: id,
      gamePhase: 'diagnosing',
      showMedicineSelector: false,
      selectedMedicineId: null,
      pendingAction: null,
    })
  },

  examine: () => {
    const state = get()
    const activeCase = state.cases.find(c => c.id === state.activeCaseId)
    if (!activeCase) return

    const scanner = state.equipment.find(e => e.requiredAction === 'examine')
    if (scanner?.status !== 'normal') return
    if (state.actionCooldowns.examine > Date.now()) return

    const updatedCases = state.cases.map(c =>
      c.id === activeCase.id ? { ...c, examined: true } : c
    )

    set({
      cases: updatedCases,
      actionCooldowns: { ...state.actionCooldowns, examine: Date.now() + 3000 },
    })
  },

  medicate: () => {
    set({ showMedicineSelector: true, pendingAction: 'medicate' })
  },

  inject: () => {
    set({ showMedicineSelector: true, pendingAction: 'inject' })
  },

  feed: () => {
    set({ showMedicineSelector: true, pendingAction: 'feed' })
  },

  isolate: () => {
    get().performTreatment('isolate')
  },

  selectMedicine: (id: string) => {
    const state = get()
    const action = state.pendingAction
    if (!action) return

    const medicine = getMedicine(id)
    if (medicine && state.player.coins < medicine.cost) {
      const activeCase = state.cases.find(c => c.id === state.activeCaseId)
      if (!activeCase) return

      const disease = getDisease(activeCase.diseaseId)
      const itemType = action === 'feed' ? '食物' : '药品'
      const result: DiagnosisResult = {
        success: false,
        diseaseName: disease?.name || '',
        actionTaken: action,
        correctAction: disease?.correctAction || 'medicate',
        medicineUsed: id,
        correctMedicine: disease?.medicineId || null,
        coinsEarned: 0,
        medicineCost: medicine.cost,
        accidentType: null,
        damagedEquipment: null,
        message: `星币不足！${medicine.name} 需要 ${medicine.cost} ⬡，你只有 ${state.player.coins} ⬡`,
        errorType: 'funds',
      }

      set({
        gamePhase: 'result',
        diagnosisResult: result,
        showMedicineSelector: false,
        selectedMedicineId: null,
        pendingAction: null,
      })
      return
    }

    get().performTreatment(action, id)
  },

  cancelMedicineSelect: () => {
    set({ showMedicineSelector: false, selectedMedicineId: null, pendingAction: null })
  },

  performTreatment: (action: ActionType, medicineId?: string | null) => {
    const state = get()
    const activeCase = state.cases.find(c => c.id === state.activeCaseId)
    if (!activeCase) return

    const disease = getDisease(activeCase.diseaseId)
    if (!disease) return

    const requiredEquip = state.equipment.find(e => e.requiredAction === action)
    if (requiredEquip?.status !== 'normal') return

    const actionCorrect = action === disease.correctAction
    const needsMedicine = disease.medicineId !== null
    const medicine = medicineId ? getMedicine(medicineId) : null
    const medicineCorrect = !needsMedicine || (medicineId !== undefined && medicineId === disease.medicineId)
    const medicineCost = medicine?.cost || 0

    let errorType: 'action' | 'medicine' | null = null
    if (!actionCorrect) errorType = 'action'
    else if (actionCorrect && !medicineCorrect) errorType = 'medicine'

    const isCorrect = actionCorrect && medicineCorrect
    const rewardMultiplier = getRewardMultiplier(state.businessRating.stars)

    if (isCorrect) {
      const baseCoins = getCoinsForUrgency(activeCase.urgency)
      const coinsEarned = Math.round(baseCoins * rewardMultiplier)
      const expGain = activeCase.urgency === 'high' ? 30 : activeCase.urgency === 'medium' ? 20 : 10
      const netCoins = coinsEarned - medicineCost
      const newExp = state.player.exp + expGain
      const levelUp = newExp >= expPerLevel
      const newLevel = levelUp ? state.player.level + 1 : state.player.level
      const newExpAfterLevel = levelUp ? newExp - expPerLevel : newExp

      const updatedCases = state.cases.map(c =>
        c.id === activeCase.id ? { ...c, status: 'cured' as const } : c
      )

      const newPlayer = {
        ...state.player,
        coins: state.player.coins + netCoins,
        level: newLevel,
        exp: newExpAfterLevel,
        cured: state.player.cured + 1,
        totalIncome: state.player.totalIncome + coinsEarned,
        totalMedicineCost: state.player.totalMedicineCost + medicineCost,
      }

      const itemType = action === 'feed' ? '食物' : action === 'inject' ? '注射剂' : '药品'
      let message = `诊断正确！${activeCase.petName} 的「${disease.name}」已治愈！`
      if (medicineCost > 0) {
        message += `（扣除${itemType}费 ${medicineCost} ⬡）`
      }
      if (rewardMultiplier > 1) {
        message += ` [${Math.round((rewardMultiplier - 1) * 100)}% 奖励加成]`
      }

      const result: DiagnosisResult = {
        success: true,
        diseaseName: disease.name,
        actionTaken: action,
        correctAction: disease.correctAction,
        medicineUsed: medicineId || null,
        correctMedicine: disease.medicineId,
        coinsEarned: netCoins,
        medicineCost,
        accidentType: null,
        damagedEquipment: null,
        message,
        errorType: null,
      }

      const oldScores = calculateRatingScores(state.player, state.equipment)
      const newScores = calculateRatingScores(newPlayer, state.equipment)

      const changes: RatingChange[] = []
      const cureRateDelta = newScores.cureRate - oldScores.cureRate
      if (cureRateDelta !== 0) {
        changes.push(createRatingChange('cureRate', cureRateDelta, '成功治愈病例'))
      }
      const netIncomeDelta = newScores.netIncome - oldScores.netIncome
      if (netIncomeDelta !== 0) {
        changes.push(createRatingChange('netIncome', netIncomeDelta, `净收入 ${netIncomeDelta > 0 ? '增加' : '减少'}`))
      }
      const avgCostDelta = newScores.avgTreatmentCost - oldScores.avgTreatmentCost
      if (avgCostDelta !== 0) {
        changes.push(createRatingChange('avgTreatmentCost', avgCostDelta, '平均诊疗成本变化'))
      }

      const recentChanges = [...changes, ...state.businessRating.recentChanges].slice(0, 5)
      const newRating = calculateBusinessRating(newPlayer, state.equipment, recentChanges)

      set({
        cases: updatedCases,
        player: newPlayer,
        businessRating: newRating,
        gamePhase: 'result',
        diagnosisResult: result,
        showMedicineSelector: false,
        selectedMedicineId: null,
        pendingAction: null,
      })
    } else {
      const penalty = getPenaltyForAccident(activeCase.urgency)
      const totalDeduction = penalty + medicineCost
      const damagedEquipId = disease.accidentType === 'bite'
        ? requiredEquip?.id || null
        : null

      const updatedCases = state.cases.map(c =>
        c.id === activeCase.id ? { ...c, status: 'accident' as const } : c
      )

      const updatedEquipment = damagedEquipId
        ? state.equipment.map(e =>
            e.id === damagedEquipId ? { ...e, status: 'damaged' as const } : e
          )
        : state.equipment

      const newPlayer = {
        ...state.player,
        coins: Math.max(0, state.player.coins - totalDeduction),
        misdiagnosed: state.player.misdiagnosed + 1,
        totalMedicineCost: state.player.totalMedicineCost + medicineCost,
      }

      let message = ''
      const itemType = action === 'feed' ? '食物' : action === 'inject' ? '注射剂' : '药品'
      if (errorType === 'action') {
        message = `误诊！${activeCase.petName} 患的是「${disease.name}」，应该${getActionLabel(disease.correctAction)}而不是${getActionLabel(action)}！`
        if (medicineCost > 0) {
          message += `（扣除${itemType}费 ${medicineCost} ⬡）`
        }
      } else if (errorType === 'medicine') {
        const correctMed = disease.medicineId ? getMedicine(disease.medicineId) : null
        const usedMed = medicineId ? getMedicine(medicineId) : null
        message = `用错${itemType}了！${activeCase.petName} 患的是「${disease.name}」，应该用「${correctMed?.name || '正确物品'}」而不是「${usedMed?.name || '未知物品'}」！（扣除${itemType}费 ${medicineCost} ⬡）`
      }

      const result: DiagnosisResult = {
        success: false,
        diseaseName: disease.name,
        actionTaken: action,
        correctAction: disease.correctAction,
        medicineUsed: medicineId || null,
        correctMedicine: disease.medicineId,
        coinsEarned: -totalDeduction,
        medicineCost,
        accidentType: disease.accidentType,
        damagedEquipment: damagedEquipId,
        message,
        errorType,
      }

      const oldScores = calculateRatingScores(state.player, state.equipment)
      const newScores = calculateRatingScores(newPlayer, updatedEquipment)

      const changes: RatingChange[] = []
      const cureRateDelta = newScores.cureRate - oldScores.cureRate
      if (cureRateDelta !== 0) {
        changes.push(createRatingChange('cureRate', cureRateDelta, '误诊导致治愈率下降'))
      }
      const accidentDelta = newScores.accidentCount - oldScores.accidentCount
      if (accidentDelta !== 0) {
        changes.push(createRatingChange('accidentCount', accidentDelta, '发生医疗事故'))
      }
      if (damagedEquipId) {
        const equipDelta = newScores.equipmentIntegrity - oldScores.equipmentIntegrity
        if (equipDelta !== 0) {
          changes.push(createRatingChange('equipmentIntegrity', equipDelta, '设备被损坏'))
        }
      }

      const recentChanges = [...changes, ...state.businessRating.recentChanges].slice(0, 5)
      const newRating = calculateBusinessRating(newPlayer, updatedEquipment, recentChanges)

      set({
        cases: updatedCases,
        equipment: updatedEquipment,
        player: newPlayer,
        businessRating: newRating,
        gamePhase: 'accident',
        accidentType: disease.accidentType,
        diagnosisResult: result,
        showMedicineSelector: false,
        selectedMedicineId: null,
        pendingAction: null,
      })
    }
  },

  repairEquipment: (id: string) => {
    const state = get()
    const equip = state.equipment.find(e => e.id === id)
    if (!equip || equip.status === 'normal') return
    if (state.player.coins < equip.repairCost) return

    const updatedEquipment = state.equipment.map(e =>
      e.id === id ? { ...e, status: 'normal' as const } : e
    )
    const newPlayer = {
      ...state.player,
      coins: state.player.coins - equip.repairCost,
    }

    const oldScores = calculateRatingScores(state.player, state.equipment)
    const newScores = calculateRatingScores(newPlayer, updatedEquipment)
    const equipDelta = newScores.equipmentIntegrity - oldScores.equipmentIntegrity

    const changes: RatingChange[] = []
    if (equipDelta !== 0) {
      changes.push(createRatingChange('equipmentIntegrity', equipDelta, `修复了 ${equip.name}`))
    }
    const netIncomeDelta = newScores.netIncome - oldScores.netIncome
    if (netIncomeDelta !== 0) {
      changes.push(createRatingChange('netIncome', netIncomeDelta, '维修设备支出'))
    }

    const recentChanges = [...changes, ...state.businessRating.recentChanges].slice(0, 5)
    const newRating = calculateBusinessRating(newPlayer, updatedEquipment, recentChanges)

    set({
      equipment: updatedEquipment,
      player: newPlayer,
      businessRating: newRating,
    })
  },

  dismissResult: () => {
    const state = get()
    const remainingCases = state.cases.filter(c => c.status !== 'cured' && c.status !== 'accident')
    while (remainingCases.length < 4) {
      remainingCases.push(generatePetCaseWithRating(state.businessRating.stars))
    }

    set({
      activeCaseId: null,
      gamePhase: 'idle',
      diagnosisResult: null,
      cases: remainingCases,
    })
  },

  dismissAccident: () => {
    const state = get()
    const remainingCases = state.cases.filter(c => c.status !== 'cured' && c.status !== 'accident')
    while (remainingCases.length < 4) {
      remainingCases.push(generatePetCaseWithRating(state.businessRating.stars))
    }

    set({
      activeCaseId: null,
      gamePhase: 'idle',
      accidentType: null,
      diagnosisResult: null,
      cases: remainingCases,
    })
  },

  generateNewCase: () => {
    const state = get()
    const newCase = generatePetCaseWithRating(state.businessRating.stars)
    set({ cases: [...state.cases, newCase] })
  },

  loadTestCases: () => {
    set({
      cases: generateTestCases(),
      activeCaseId: null,
      gamePhase: 'idle',
      accidentType: null,
      diagnosisResult: null,
      showMedicineSelector: false,
      selectedMedicineId: null,
      pendingAction: null,
    })
    get().refreshRating()
  },

  resetGame: () => {
    set({
      cases: generateInitialCases(5),
      activeCaseId: null,
      player: { ...initialPlayer },
      equipment: initialEquipment.map(e => ({ ...e })),
      gamePhase: 'idle',
      accidentType: null,
      diagnosisResult: null,
      actionCooldowns: {
        examine: 0,
        medicate: 0,
        inject: 0,
        feed: 0,
        isolate: 0,
      },
      showMedicineSelector: false,
      selectedMedicineId: null,
      pendingAction: null,
      businessRating: { ...initialRating, scores: { ...initialRating.scores }, recentChanges: [] },
    })
  },
}))
