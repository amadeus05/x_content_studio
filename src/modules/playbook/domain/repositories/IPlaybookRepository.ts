import { Methodology } from "../entities/Methodology.ts";
import { ToneProfile } from "../entities/ToneProfile.ts";

export interface IPlaybookRepository {
  getAllMethodologies(): Promise<Methodology[]>;
  getMethodologyById(id: string): Promise<Methodology | null>;
  saveMethodology(methodology: Methodology): Promise<void>;
  deleteMethodology(id: string): Promise<void>;
  getToneProfile(): Promise<ToneProfile>;
  saveToneProfile(profile: ToneProfile): Promise<void>;
}
