import { LOCAL_GYM_EVENT_BALANCE } from './balance';
import type { LocalGymEvent, LocalGymEventId } from '../types';

export const LOCAL_GYM_EVENTS: Record<LocalGymEventId, LocalGymEvent> = {
  'chest-day': {
    id: 'chest-day',
    name: 'Chest Day',
    shortName: 'Chest Day',
    description: 'The benches are cursed in a useful way.',
    bonusLabel: 'Strength workout XP +10%',
    effects: {
      strengthWorkoutXpMultiplier: LOCAL_GYM_EVENT_BALANCE.strengthWorkoutXpMultiplier
    }
  },
  'cardio-chaos': {
    id: 'cardio-chaos',
    name: 'Cardio Chaos',
    shortName: 'Cardio',
    description: 'Everyone pretends they planned to train endurance.',
    bonusLabel: 'Endurance workout XP +10%',
    effects: {
      enduranceWorkoutXpMultiplier: LOCAL_GYM_EVENT_BALANCE.enduranceWorkoutXpMultiplier
    }
  },
  'mythic-monday': {
    id: 'mythic-monday',
    name: 'Mythic Monday',
    shortName: 'Mythic',
    description: 'The weird beasts clock in early.',
    bonusLabel: 'Exotic spawn chance slightly increased',
    effects: {
      exoticSpawnBonus: LOCAL_GYM_EVENT_BALANCE.mythicMondayExoticSpawnBonus
    }
  },
  'flex-friday': {
    id: 'flex-friday',
    name: 'Flex Friday',
    shortName: 'Flex',
    description: 'Reward machines respect the pump.',
    bonusLabel: 'Steroid rewards +1',
    effects: {
      steroidRewardBonus: LOCAL_GYM_EVENT_BALANCE.flexFridaySteroidRewardBonus
    }
  },
  'beast-weekend': {
    id: 'beast-weekend',
    name: 'Beast Weekend',
    shortName: 'Beast',
    description: 'Bosses show up with dramatic entrance music.',
    bonusLabel: 'Boss rewards +15%',
    effects: {
      bossRewardMultiplier: LOCAL_GYM_EVENT_BALANCE.beastWeekendBossRewardMultiplier,
      bossSteroidRewardBonus: LOCAL_GYM_EVENT_BALANCE.beastWeekendBossSteroidRewardBonus
    }
  }
};

export function getCurrentGymEvent(date = new Date()): LocalGymEvent {
  const day = date.getDay();

  if (day === 1) {
    return LOCAL_GYM_EVENTS['mythic-monday'];
  }

  if (day === 2 || day === 4) {
    return LOCAL_GYM_EVENTS['cardio-chaos'];
  }

  if (day === 3) {
    return LOCAL_GYM_EVENTS['chest-day'];
  }

  if (day === 5) {
    return LOCAL_GYM_EVENTS['flex-friday'];
  }

  return LOCAL_GYM_EVENTS['beast-weekend'];
}
