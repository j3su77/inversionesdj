import { LoanStatus, type Prisma } from "@prisma/client";

/** Préstamos cancelados (eliminados) no deben contarse ni mostrarse en UI operativa. */
export const loanNotCancelledWhere: Prisma.LoanWhereInput = {
  status: { not: LoanStatus.CANCELLED },
};
