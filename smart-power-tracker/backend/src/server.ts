import express from 'express';
import cors from 'cors';
import { Sequelize, DataTypes } from 'sequelize';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite'
});

const Device = sequelize.define('Device', {
  name: DataTypes.STRING,
  wattage: DataTypes.FLOAT,
  startTime: DataTypes.STRING,
  endTime: DataTypes.STRING
});

const Consumption = sequelize.define('Consumption', {
  deviceId: DataTypes.STRING,
  kWh: DataTypes.FLOAT,
  cost: DataTypes.FLOAT,
  carbonFootprint: DataTypes.FLOAT,
  date: DataTypes.DATEONLY
});

sequelize.sync();

app.get('/devices', async (req, res) => {
  const devices = await Device.findAll();
  res.json(devices);
});

app.post('/devices', async (req, res) => {
  const device = await Device.create(req.body);
  res.json(device);
});

app.get('/consumptions', async (req, res) => {
  const consumptions = await Consumption.findAll();
  res.json(consumptions);
});

app.post('/consumptions', async (req, res) => {
  const consumption = await Consumption.create(req.body);
  res.json(consumption);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});