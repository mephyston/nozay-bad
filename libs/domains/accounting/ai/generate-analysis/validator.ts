import { Type } from '@sinclair/typebox';

export const generateAnalysisSchema = Type.Object({
  report: Type.Any(),
  section: Type.Union([Type.Literal('tresorerie'), Type.Literal('resultat')]),
});
