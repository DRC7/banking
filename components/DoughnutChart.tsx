"use client"

import {Chart as ChartJS, ArcElement, Tooltip, Legend }
from "chart.js"
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend)

const DoughnutChart = ({accounts}: DoughnutChartProps) => {
    const data = {
        datasets: [
            {
                label: 'Banks',
                data: [1250, 2500, 4750],
                backgroundColor: ['#0747b6', '#2265d8', '#2f91fa']
            }
        ],
        labels: []
    }
    return <Doughnut data={data} />

}


export default DoughnutChart