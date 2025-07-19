import axios from "axios";
import { imageUpload } from "../../../api/utils";
import AddPlantForm from "../../../components/Form/AddPlantForm";
import useAuth from "../../../hooks/useAuth";
import { useState } from "react";
import toast from "react-hot-toast";

const AddPlant = () => {
	const { user } = useAuth();
	const [isUploading, setIsUploading] = useState(false);
	const handleFormSubmit = async (e) => {
		setIsUploading(true);
		e.preventDefault();
		// Handle form submission logic
		const form = e.target;
		const formData = new FormData(form);
		const plantData = Object.fromEntries(formData.entries());
		// console.log(plantData);
		const image = form.image.files[0];

		try {
			const imageUrl = await imageUpload(image);
			// Add image URL to plant data
			plantData.image = imageUrl;
			plantData.price = parseFloat(plantData.price);
			plantData.quantity = parseInt(plantData.quantity);
			plantData.seller = {
				name: user?.displayName || user?.name,
				email: user?.email,
				avatar: user?.photoURL,
			};
			const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/add-plant`, plantData);
			toast.success("Plant added successfully!");
			console.table(data);
			form.reset();
		} catch (e) {
			console.error(e);
			toast.error("Failed to add plant.");
		} finally {
			setIsUploading(false);
		}
	};
	return (
		<div>
			{/* Form */}
			<AddPlantForm
				handleFormSubmit={handleFormSubmit}
				isUploading={isUploading}
			/>
		</div>
	);
};

export default AddPlant;
