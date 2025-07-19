import AdminStatistics from '../../../components/Dashboard/Statistics/AdminStatistics'
import LoadingSpinner from '../../../components/Shared/LoadingSpinner';
import useRole from '../../../hooks/useRole'
const Statistics = () => {
  const [role, isRoleLoading] = useRole();

  if (isRoleLoading) return <LoadingSpinner />
  return (
    <div>
      {role === 'admin' && <AdminStatistics />}
      {/* {role === 'customer' && <CustomerStatistics />} */}
      {/* {role === 'seller' && <SellerStatistics />} */}
    </div>
  )
}

export default Statistics
