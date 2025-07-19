require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 3000;
const app = express();
// middleware
const corsOptions = {
	origin: ["http://localhost:5173", "http://localhost:5174"],
	credentials: true,
	optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

const verifyToken = async (req, res, next) => {
	const token = req.cookies?.token;

	if (!token) {
		return res.status(401).send({ message: "unauthorized access" });
	}
	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
		if (err) {
			console.log(err);
			return res.status(401).send({ message: "unauthorized access" });
		}
		req.user = decoded;
		next();
	});
};

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.MONGODB_URI, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});
async function run() {
	try {
		const db = client.db("plantDB");
		const plantsCollection = db.collection("plants");
		const ordersCollection = db.collection("orders");
		const usersCollection = db.collection("users");

		// verify Admin
		const verifyAdmin = async (req, res, next) => {
			const email = req?.user?.email;
			const user = await usersCollection.findOne({ email });
			if (!user || user?.role !== "admin") return res.status(403).send({ message: "Admin only Actions" });
			next();
		};

		const verifySeller = async (req, res, next) => {
			const email = req?.user?.email;
			const user = await usersCollection.findOne({ email });
			if (!user || user?.role !== "seller") return res.status(403).send({ message: "Admin only Actions" });
			next();
		};

		// Add a Plant in DB
		app.post("/add-plant", async (req, res) => {
			const plant = req.body;
			const result = await plantsCollection.insertOne(plant);
			res.send(result);
		});

		// Get All Plants data
		app.get("/plants", async (req, res) => {
			const result = await plantsCollection.find().toArray();
			res.send(result);
		});
		// Get a single Plants data
		app.get("/plant/:id", async (req, res) => {
			const id = req.params.id;
			const result = await plantsCollection.findOne({
				_id: new ObjectId(id),
			});
			res.send(result);
		});

		// Create payment intent
		app.post("/create-payment-intent", async (req, res) => {
			const { plantId, quantity } = req.body;
			const plant = await plantsCollection.findOne({ _id: new ObjectId(plantId) });
			if (!plant) {
				return res.status(404).send({ message: "Plant Not Found" });
			}
			const totalPrice = quantity * plant?.price * 100;
			// Stripe
			const paymentIntent = await stripe.paymentIntents.create({
				amount: totalPrice,
				currency: "usd",
				automatic_payment_methods: {
					enabled: true,
				},
			});

			res.send({ clientSecret: paymentIntent.client_secret });
		});

		// Save Order Data In Orders Collection in db

		app.post("/order", async (req, res) => {
			const orderData = req.body;
			const result = await ordersCollection.insertOne(orderData);
			res.send(result);
		});

		// get all order info for customers
		app.get("/orders/customer/:email", verifyToken, async (req, res) => {
			const email = req.params.email;
			const filter = { "customer.email": email };
			const result = await ordersCollection.find(filter).toArray();
			res.send(result);
		});

		// get all order info for seller
		app.get("/orders/seller/:email", verifyToken, verifySeller, async (req, res) => {
			const email = req.params.email;
			const filter = { "seller.email": email };
			const result = await ordersCollection.find(filter).toArray();
			res.send(result);
		});

		// Update plant quantity (increase / decrease)

		app.patch("/quantity-update/:id", async (req, res) => {
			const id = req.params.id;
			const { quantityToUpdate, status } = req.body;
			const filter = { _id: new ObjectId(id) };
			const updateDoc = {
				$inc: {
					quantity: status === "increase" ? quantityToUpdate : -quantityToUpdate, // Increase or Decrease quantity
				},
			};
			const result = await plantsCollection.updateOne(filter, updateDoc);
			res.send(result);
		});

		// Save or Update users info in db
		app.post("/user", async (req, res) => {
			const userData = req.body;
			userData.role = "customer";
			userData.created_at = new Date().toISOString();
			userData.last_loggedIn = new Date().toISOString();
			const query = { email: userData?.email };
			const alreadyExist = await usersCollection.findOne(query);
			console.log("User Already Exist: ", !!alreadyExist);
			if (!!alreadyExist) {
				const result = await usersCollection.updateOne(query, { $set: { last_loggedIn: new Date().toISOString() } });
				console.log("Updated User");
				return res.send(result);
			}
			console.log("Creating User...");
			const result = await usersCollection.insertOne(userData);
			console.log("successful!");
			res.send(result);
		});

		// get user's role

		app.get("/user/role/:email", async (req, res) => {
			const email = req.params.email;
			const result = await usersCollection.findOne({ email });
			if (!result) return res.status(404).send({ message: "User Not Found!" });
			res.send({ role: result?.role });
		});

		// get all users for admin
		app.get("/all-users", verifyToken, verifyAdmin, async (req, res) => {
			console.log(req.user);
			const filter = {
				email: {
					$ne: req?.user?.email,
				},
			};
			const result = await usersCollection.find(filter).toArray();
			res.send(result);
		});

		// Update User's Role
		app.patch("/user/role/update/:email", verifyToken, verifyAdmin, async (req, res) => {
			const email = req.params.email;
			const { role } = req.body;
			const filter = { email };
			const updatedDoc = {
				$set: {
					role,
					status: "verified",
				},
			};

			const result = await usersCollection.updateOne(filter, updatedDoc);
			res.send(result);
		});

		// Become Seller Request
		app.patch("/user/become-seller/:email", verifyToken, async (req, res) => {
			const email = req.params.email;
			const filter = { email };
			const updatedDoc = {
				$set: {
					status: "requested",
				},
			};

			const result = await usersCollection.updateOne(filter, updatedDoc);
			res.send(result);
		});

		// admin stats

		// Defines a GET endpoint at the URL '/admin-stats'.
		// When a client sends a GET request to this URL, this asynchronous function will be executed.

		// 'async' allows us to use the 'await' keyword for handling promises.
		// 'req' (request) and 'res' (response) are objects provided by Express.js to handle the HTTP request and response.
		app.get("/admin-stats", verifyToken, verifyAdmin, async (req, res) => {
			// Awaits the promise from estimatedDocumentCount() to get the approximate number of documents in the 'usersCollection'.
			// This is generally faster than countDocuments() but less precise.
			const totalUsers = await usersCollection.estimatedDocumentCount();
			// Awaits and gets the approximate number of documents in the 'plantsCollection'.
			const totalPlants = await plantsCollection.estimatedDocumentCount();
			// Awaits and gets the approximate number of documents in the 'ordersCollection'.
			const totalOrders = await ordersCollection.estimatedDocumentCount();

			// This starts a MongoDB aggregation pipeline on the 'ordersCollection'.
			// Aggregation allows for processing data records and returning computed results.
			const result = await ordersCollection
				.aggregate([
					// The first stage of the pipeline: $addFields.
					{
						// This stage adds a new field to each document in the collection.
						$addFields: {
							// We are adding a new field named 'createdAt'.
							// The value is derived by converting the existing '_id' field to a Date object.
							// This works because MongoDB's default ObjectId format embeds a timestamp.
							createdAt: { $toDate: "$_id" },
						},
					},
					// The second stage of the pipeline: $group.
					{
						// This stage groups documents together based on a specified identifier.
						$group: {
							// We are grouping by the date part of the 'createdAt' field.
							_id: {
								// $dateToString formats a date object into a string.
								$dateToString: {
									// The desired string format is "Year-Month-Day".
									format: "%Y-%m-%d",
									// The date field to format is the 'createdAt' field we just created.
									date: "$createdAt",
								},
							},
							// For each group (each day), we calculate the total revenue.
							// '$sum' is an accumulator operator that sums up numeric values.
							revenue: { $sum: "$price" },
							// We also count the number of orders for each day.
							// '$sum: 1' adds 1 for each document in the group, effectively counting them.
							orders: { $sum: 1 },
						},
					},
				])
				// .toArray() executes the pipeline and returns the results as a JavaScript array.
				.toArray();

			// The 'result' from aggregation is an array of objects like: [{ _id: '2023-10-27', revenue: 500, orders: 5 }, ...].
			// We use the .map() method to transform this array into a more frontend-friendly format for a bar chart.
			const barChartData = result.map((data) => {
				// For each item in the 'result' array, we return a new object.
				return {
					date: data._id, // The date string (e.g., "2023-10-27").
					revenue: data.revenue, // The total revenue for that date.
					orders: data.orders, // The total number of orders for that date.
				};
			});

			// We use the .reduce() method to calculate the grand total revenue from all the daily revenues.
			// It iterates over the 'result' array, accumulating a single value (the sum).
			// 'sum' is the accumulator, 'data' is the current element, and 0 is the initial value of 'sum'.
			const totalRevenue = result.reduce((sum, data) => sum + data?.revenue, 0);

			// Finally, we send a JSON response back to the client.
			// This object contains all the calculated statistics.
			res.send({ totalUsers, totalPlants, totalOrders, totalRevenue, barChartData });
		});

		// Generate jwt token
		app.post("/jwt", async (req, res) => {
			const email = req.body;
			const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
				expiresIn: "365d",
			});
			res
				.cookie("token", token, {
					httpOnly: true,
					secure: process.env.NODE_ENV === "production",
					sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
				})
				.send({ success: true });
		});
		// Logout
		app.get("/logout", async (req, res) => {
			try {
				res
					.clearCookie("token", {
						maxAge: 0,
						secure: process.env.NODE_ENV === "production",
						sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
					})
					.send({ success: true });
			} catch (err) {
				res.status(500).send(err);
			}
		});

		// Send a ping to confirm a successful connection
		await client.db("admin").command({ ping: 1 });
		console.log("Pinged your deployment. You successfully connected to MongoDB!");
	} finally {
		// Ensures that the client will close when you finish/error
	}
}
run().catch(console.dir);

app.get("/", (req, res) => {
	res.send("Hello from plantNet Server..");
});

app.listen(port, () => {
	console.log(`plantNet is running on port ${port}`);
});
