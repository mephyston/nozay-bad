export interface SaveTeamStaffInput {
  teamId: number;
  /** `null` retire la désignation — et donc le droit de composer l'équipe. */
  captainLicence: string | null;
  viceCaptainLicence: string | null;
}

export interface SaveTeamStaffOutput {
  teamId: number;
  captainLicence: string | null;
  viceCaptainLicence: string | null;
}
