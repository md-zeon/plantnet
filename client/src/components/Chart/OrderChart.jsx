import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
const OrderChart = ({ chartData }) => {
	return (
		<div>
			<BarChart
				width={730}
				height={250}
				data={chartData}
			>
				<CartesianGrid strokeDasharray='3 3' />
				<XAxis dataKey='date' />
				<YAxis />
				<Tooltip />
				<Legend />
				<Bar
					dataKey='orders'
					fill='#8884d8'
				/>
				<Bar
					dataKey='revenue'
					fill='#82ca9d'
				/>
			</BarChart>
		</div>
	);
};

export default OrderChart;
