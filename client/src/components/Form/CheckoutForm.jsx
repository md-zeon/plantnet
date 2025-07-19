import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import "./CheckoutForm.css"; // Assuming you have some styles for the form
import { useState, useEffect } from "react";
import axios from "axios";
import useAxiosSecure from "../../hooks/useAxiosSecure";
import useAuth from "../../hooks/useAuth";
import toast from "react-hot-toast";
const CheckoutForm = ({ totalPrice, closeModal, orderData, fetchPlant }) => {
	const stripe = useStripe();
	const elements = useElements();
	const [cardError, setCardError] = useState(null);
	const [processing, setProcessing] = useState(false);
	const [clientSecret, setClientSecret] = useState("");
	const axiosSecure = useAxiosSecure();
	const { user } = useAuth();

	useEffect(() => {
		const getClientSecret = async () => {
			// Call your backend to create a PaymentIntent and get the client secret
			const { data } = await axiosSecure.post("/create-payment-intent", {
				quantity: orderData?.quantity,
				plantId: orderData?.plantId,
			});
			setClientSecret(data?.clientSecret);
		};
		getClientSecret();
	}, [axiosSecure, orderData]);

	const handleSubmit = async (event) => {
		// Block native form submission.
		event.preventDefault();
		setProcessing(true);

		if (!stripe || !elements) {
			// Stripe.js has not loaded yet. Make sure to disable
			// form submission until Stripe.js has loaded.
			return;
		}

		// Get a reference to a mounted CardElement. Elements knows how
		// to find your CardElement because there can only ever be one of
		// each type of element.
		const card = elements.getElement(CardElement);

		if (card == null) {
			return;
		}

		// Use your card Element with other Stripe.js APIs
		const { error, paymentMethod } = await stripe.createPaymentMethod({
			type: "card",
			card,
		});

		if (error) {
			console.log("[error]", error);
			setCardError(error.message);
			setProcessing(false);
			return;
		} else {
			setCardError(null);
			console.log("[PaymentMethod]", paymentMethod);
		}
		// Here you would typically handle the payment processing
		const result = await stripe.confirmCardPayment(clientSecret, {
			payment_method: {
				card: card,
				billing_details: {
					name: user?.displayName,
					email: user?.email,
				},
			},
		});
		console.log(result);

		if (result?.error) {
			setCardError(result?.error?.message);
			return;
		}

		if (result?.paymentIntent?.status === "succeeded") {
			// Payment succeeded, handle post-payment actions
			// save OrderData in db
			orderData.transactionId = result?.paymentIntent?.id;
			try {
				// Update plant Quantity in db from plants collection
				const { data } = await axiosSecure.post("/order", orderData);
				if (data?.acknowledged) {
					toast.success("Payment Successful!");
				} else {
					toast.error("Failed to save order data. Please try again.");
				}
				const { data: result } = await axiosSecure.patch(`/quantity-update/${orderData?.plantId}`, {
					quantityToUpdate: orderData?.quantity,
					status: "decrease",
				});
				fetchPlant();
				console.log(result);
			} catch (error) {
				console.error("Error saving order data:", error);
				setCardError("Failed to save order data. Please try again.");
				return;
			} finally {
				closeModal();
				setProcessing(false);
			}
		}
	};

	return (
		<form onSubmit={handleSubmit}>
			<CardElement
				options={{
					style: {
						base: {
							fontSize: "16px",
							color: "#424770",
							"::placeholder": {
								color: "#aab7c4",
							},
						},
						invalid: {
							color: "#9e2146",
						},
					},
				}}
			/>
			{cardError && <p className='text-red-500 mt-2'>{cardError}</p>}
			<div className='mt-4 flex gap-2'>
				<button
					type='submit'
					disabled={!stripe || processing}
					className='px-4 py-2 bg-lime-500 text-white rounded hover:bg-lime-600 cursor-pointer transition duration-200'
				>
					{processing ? "Processing..." : `Pay $${totalPrice}`}
				</button>
				<button
					onClick={closeModal}
					className='px-4 py-2 bg-red-400 text-white rounded hover:bg-red-500'
				>
					Cancel
				</button>
			</div>
		</form>
	);
};

export default CheckoutForm;
