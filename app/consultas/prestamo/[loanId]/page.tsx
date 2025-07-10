import { getLoanById } from '@/actions/loans';
import { PublicLoanInfo } from '../_components/public-loan-info';


const PublicLoanPage = async ({ params }: { params: Promise<{ loanId: string }> }) => {
  const { loanId } = await params;
  const loan = await getLoanById(loanId);

  if (!loan) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-2xl font-bold">Lo sentimos, prestamo no encontrado</div>
      </div>
    );
  }


  return (
    <div>
      <PublicLoanInfo loan={loan} />
    </div>
  )
}

export default PublicLoanPage