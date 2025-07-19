// import { useEffect, useState } from "react";
import useAxiosSecure from "./useAxiosSecure";
import useAuth from "./useAuth";
import { useQuery } from "@tanstack/react-query";

const useRole = () => {
	// This hook can be used to manage user roles
	// const [role, setRole] = useState(null);
	// const [isRoleLoading, setIsRoleLoading] = useState(true);
	const axiosSecure = useAxiosSecure();
	const { user, loading } = useAuth();

	const { data: role, isLoading: isRoleLoading } = useQuery({
		queryKey: ["role", user?.email],
		enabled: !loading && !!user?.email, 
		queryFn: async () => {
			const { data } = await axiosSecure.get(`/user/role/${user?.email}`);
			return data;
		},
	});

	// useEffect(() => {
	// 	if (user) {
	// 		const fetchUserRole = async () => {
	// 			try {
	// 				const { data } = await axiosSecure.get(`/user/role/${user?.email}`);
	// 				setRole(data.role);
	// 			} catch (err) {
	// 				console.error(err);
	// 			} finally {
	// 				setIsRoleLoading(false);
	// 			}
	// 		};
	// 		fetchUserRole();
	// 	} else {
	// 		setIsRoleLoading(false);
	// 	}
	// }, [user, axiosSecure]);

	return [role?.role, isRoleLoading];
};

export default useRole;
