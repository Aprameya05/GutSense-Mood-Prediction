import { create } from 'zustand';
import { Stage1Output, Stage2Output, Stage3Output, Stage4Output, Stage5Output } from '../types/models';

interface MealWizardState {
  imageUri: string | null;
  stage1: Stage1Output | null;
  stage2: Stage2Output | null;
  stage3: Stage3Output | null;
  stage4: Stage4Output | null;
  stage5: Stage5Output | null;
  mealId: 'breakfast' | 'lunch' | 'dinner' | 'snack';

  setImageUri: (uri: string) => void;
  setStage1And2: (s1: Stage1Output, s2: Stage2Output) => void;
  setStage3: (s3: Stage3Output) => void;
  setStage4And5: (s4: Stage4Output, s5: Stage5Output) => void;
  setMealId: (id: any) => void;
  resetWizard: () => void;
}

export const useMealWizardStore = create<MealWizardState>((set) => ({
  imageUri: null,
  stage1: null,
  stage2: null,
  stage3: null,
  stage4: null,
  stage5: null,
  mealId: 'snack',

  setImageUri: (uri) => set({ imageUri: uri }),
  setStage1And2: (stage1, stage2) => set({ stage1, stage2 }),
  setStage3: (stage3) => set({ stage3 }),
  setStage4And5: (stage4, stage5) => set({ stage4, stage5 }),
  setMealId: (mealId) => set({ mealId }),
  resetWizard: () => set({
    imageUri: null, stage1: null, stage2: null, stage3: null, stage4: null, stage5: null, mealId: 'snack'
  }),
}));
