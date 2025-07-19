import axios from "axios";

// upload image to imgbb and return image url

export const imageUpload = async (imageData) => {
	const imageFormData = new FormData();
	imageFormData.append("image", imageData);
	// Upload image to imgbb
	const { data } = await axios.post(
		`https://api.imgbb.com/1/upload?expiration=600&key=${import.meta.env.VITE_IMGBB_API_KEY}`,
		imageFormData,
	);
	// console.log(data);
	const imageUrl = data?.data?.display_url;
	return imageUrl;
};

// Save or Update user in DB

export const saveUserInDb = async (user) => {
	const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/user`, user);
	console.log(data);
};
