import React, { useState, useEffect } from 'react';
import { Button, TextField, Container, Typography, Box, Grid, Paper, Snackbar, CircularProgress } from '@mui/material';
import { Alert } from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Device {
  id: string;
  name: string;
  wattage: number;
  startTime: string;
  endTime: string;
}

interface Consumption {
  id: string;
  deviceId: string;
  kWh: number;
  cost: number;
  carbonFootprint: number;
  date: string;
}

const RATE_PER_KWH = 0.12;
const CARBON_FACTOR = 0.4;
const API_BASE_URL = 'http://localhost:3001'; // Make sure this matches your backend URL

function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [consumptions, setConsumptions] = useState<Consumption[]>([]);
  const [newDevice, setNewDevice] = useState<Omit<Device, 'id'>>({ name: '', wattage: 0, startTime: '', endTime: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const devicesResponse = await fetch(`${API_BASE_URL}/devices`);
        if (!devicesResponse.ok) {
          throw new Error(`HTTP error! status: ${devicesResponse.status}`);
        }
        const devicesData = await devicesResponse.json();
        setDevices(devicesData);

        const consumptionsResponse = await fetch(`${API_BASE_URL}/consumptions`);
        if (!consumptionsResponse.ok) {
          throw new Error(`HTTP error! status: ${consumptionsResponse.status}`);
        }
        const consumptionsData = await consumptionsResponse.json();
        setConsumptions(consumptionsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data. Please ensure the backend server is running and accessible.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddDevice = async () => {
    try {
      const deviceResponse = await fetch(`${API_BASE_URL}/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDevice),
      });

      if (!deviceResponse.ok) {
        throw new Error(`HTTP error! status: ${deviceResponse.status}`);
      }

      const device = await deviceResponse.json();
      setDevices(prevDevices => [...prevDevices, device]);
      
      const hours = calculateHours(newDevice.startTime, newDevice.endTime);
      const kWh = (newDevice.wattage * hours) / 1000;
      const cost = kWh * RATE_PER_KWH;
      const carbonFootprint = kWh * CARBON_FACTOR;
      const consumption = { 
        deviceId: device.id, 
        kWh, 
        cost, 
        carbonFootprint, 
        date: new Date().toISOString().split('T')[0] 
      };

      const consumptionResponse = await fetch(`${API_BASE_URL}/consumptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(consumption),
      });

      if (!consumptionResponse.ok) {
        throw new Error(`HTTP error! status: ${consumptionResponse.status}`);
      }

      const newConsumption = await consumptionResponse.json();
      setConsumptions(prevConsumptions => [...prevConsumptions, newConsumption]);

      setNewDevice({ name: '', wattage: 0, startTime: '', endTime: '' });
    } catch (err) {
      console.error('Error adding device:', err);
      setError('Failed to add device. Please try again.');
    }
  };

  const calculateHours = (startTime: string, endTime: string) => {
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    let diff = end.getTime() - start.getTime();
    if (diff < 0) diff += 24 * 60 * 60 * 1000; // Add 24 hours if end time is on the next day
    return diff / (1000 * 60 * 60);
  };

  const chartData = {
    labels: devices.map(device => device.name),
    datasets: [
      {
        label: 'kWh Consumption',
        data: devices.map(device => {
          const deviceConsumptions = consumptions.filter(c => c.deviceId === device.id);
          return deviceConsumptions.reduce((sum, c) => sum + c.kWh, 0);
        }),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  };

  if (isLoading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        Smart Power Tracker
      </Typography>
      <Box mb={4}>
        <Typography variant="h6" gutterBottom>Add New Device</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Device Name"
              value={newDevice.name}
              onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              type="number"
              label="Wattage"
              value={newDevice.wattage}
              onChange={(e) => setNewDevice({ ...newDevice, wattage: Number(e.target.value) })}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              fullWidth
              type="time"
              label="Start Time"
              value={newDevice.startTime}
              onChange={(e) => setNewDevice({ ...newDevice, startTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              fullWidth
              type="time"
              label="End Time"
              value={newDevice.endTime}
              onChange={(e) => setNewDevice({ ...newDevice, endTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button variant="contained" color="primary" onClick={handleAddDevice} fullWidth>
              Add Device
            </Button>
          </Grid>
        </Grid>
      </Box>
      <Box mb={4}>
        <Typography variant="h6" gutterBottom>Consumption Chart</Typography>
        <Paper style={{ padding: '20px' }}>
          <Line data={chartData} />
        </Paper>
      </Box>
      <Box>
        <Typography variant="h6" gutterBottom>Devices and Consumption</Typography>
        {devices.map(device => {
          const deviceConsumptions = consumptions.filter(c => c.deviceId === device.id);
          const totalKWh = deviceConsumptions.reduce((sum, c) => sum + c.kWh, 0);
          const totalCost = deviceConsumptions.reduce((sum, c) => sum + c.cost, 0);
          const totalCarbonFootprint = deviceConsumptions.reduce((sum, c) => sum + c.carbonFootprint, 0);
          return (
            <Paper key={device.id} style={{ padding: '10px', marginBottom: '10px' }}>
              <Typography variant="subtitle1">{device.name}</Typography>
              <Typography variant="body2">Wattage: {device.wattage}W</Typography>
              <Typography variant="body2">Usage: {device.startTime} - {device.endTime}</Typography>
              <Typography variant="body2">Total kWh: {totalKWh.toFixed(2)}</Typography>
              <Typography variant="body2">Total Cost: ${totalCost.toFixed(2)}</Typography>
              <Typography variant="body2">Carbon Footprint: {totalCarbonFootprint.toFixed(2)} kg CO2</Typography>
            </Paper>
          );
        })}
      </Box>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default App;