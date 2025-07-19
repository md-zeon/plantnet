import { Button, Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import useAxiosSecure from "../../hooks/useAxiosSecure";
import toast from "react-hot-toast";

const UpdateUserRoleModal = ({ isOpen, setIsOpen, role, userEmail }) => {
	const [updatedRole, setUpdatedRole] = useState(role);
	function close() {
		setIsOpen(false);
	}
	const axiosSecure = useAxiosSecure();
    const queryClient = useQueryClient();

	// get data = useQuery
	// update/add/delete = useMutation

	const mutation = useMutation({
		mutationFn: async (newRole) => {
			const { data } = await axiosSecure.patch(`/user/role/update/${userEmail}`, { role: newRole });
			return data;
		},
		onSuccess: (data) => {
			console.log(data);
			toast.success("User Role updated successfully");
            // invalidate query
            queryClient.invalidateQueries(["users"]);
			close();
		},
		onError: (error) => {
			console.log(error);
		},
	});

	const handleSubmit = (e) => {
		e.preventDefault();
		mutation.mutate(updatedRole);
	};

	return (
		<>
			<Dialog
				open={isOpen}
				as='div'
				className='relative z-10 focus:outline-none'
				onClose={close}
			>
				<div className='fixed inset-0 z-10 w-screen overflow-y-auto'>
					<div className='flex min-h-full items-center justify-center p-4'>
						<DialogPanel
							transition
							className='w-full max-w-md rounded-xl bg-white/5 shadow-xl p-6 backdrop-blur-2xl duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0'
						>
							<DialogTitle
								as='h3'
								className='text-base/7 font-medium text-black'
							>
								Update User Role
							</DialogTitle>
							<form onSubmit={handleSubmit}>
								<div>
									<select
										className='w-full my-3 border rounded-xl px-1.5 py-3'
										name='Role'
										value={updatedRole}
										onChange={(e) => setUpdatedRole(e.target.value)}
									>
										<option value='customer'>Customer</option>
										<option value='seller'>Seller</option>
										<option value='admin'>Admin</option>
									</select>
								</div>
								<div className='mt-4 flex justify-between'>
									<button
										type='submit'
										className='inline-flex items-center bg-lime-400 hover:bg-lime-500 py-1.5 px-3 text-sm rounded-md font-semibold cursor-pointer active:scale-95 text-gray-700'
									>
										Update
									</button>
									<Button
										type='button'
										className='inline-flex items-center gap-2 rounded-md bg-red-500 px-3 py-1.5 text-sm/6 font-semibold text-white active:scale-95 cursor-pointer shadow-inner shadow-white/10 focus:not-data-focus:outline-none data-focus:outline data-focus:outline-white data-hover:bg-red-600 data-open:bg-red-700'
										onClick={close}
									>
										Cancel
									</Button>
								</div>
							</form>
						</DialogPanel>
					</div>
				</div>
			</Dialog>
		</>
	);
};

export default UpdateUserRoleModal;
