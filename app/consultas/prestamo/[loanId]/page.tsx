import { getLoanById } from '@/actions/loans';
import { PublicLoanInfo } from '../_components/public-loan-info';


const PublicLoanPage = async ({ params }: { params: Promise<{ loanId: string }> }) => {
  const { loanId } = await params;
  const loan = await getLoanById(loanId);

  if (!loan) {
    return <div>Préstamo no encontrado</div>;
  }


  return (
    <div>
      <PublicLoanInfo loan={loan} />
    </div>
  )
}

export default PublicLoanPage