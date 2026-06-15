import { Router } from 'express';
import { LocationService } from '../services/LocationService';
import { requirePermission } from '../middleware/auth';

export const locationsRouter = Router();
const locationService = new LocationService();

locationsRouter.get('/', async (_req, res) => {
  try {
    const locations = await locationService.getLocations();
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

locationsRouter.post('/', requirePermission('settings:edit'), async (req, res) => {
  try {
    const loc = await locationService.createLocation(req.body);
    res.status(201).json(loc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create location' });
  }
});

locationsRouter.put('/:id', requirePermission('settings:edit'), async (req, res) => {
  try {
    await locationService.updateLocation(Number(req.params.id), req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update location' });
  }
});

locationsRouter.delete('/:id', requirePermission('settings:edit'), async (req, res) => {
  try {
    await locationService.deleteLocation(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete location' });
  }
});