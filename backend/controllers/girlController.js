import Girl from '../models/Girl.js';

export const getGirls = async (req, res) => {
  try {
    const { city, online } = req.query;
    const filter = {};
    
    if (city) filter.city = city;
    if (online === 'true') filter.isOnline = true;

    const girls = await Girl.find(filter)
      .select('-__v')
      .sort({ rating: -1, ordersCount: -1 })
      .limit(50);

    res.json({ girls });
  } catch (err) {
    console.error('Get girls error:', err);
    res.status(500).json({ error: 'Failed to load catalog' });
  }
};

export const getGirl = async (req, res) => {
  try {
    const girl = await Girl.findById(req.params.id).select('-__v');
    if (!girl) return res.status(404).json({ error: 'Not found' });
    res.json({ girl });
  } catch (err) {
    console.error('Get girl error:', err);
    res.status(500).json({ error: 'Failed to load girl' });
  }
};

// Admin only methods below
export const createGirl = async (req, res) => {
  try {
    const girl = await Girl.create(req.body);
    res.status(201).json({ girl });
  } catch (err) {
    console.error('Create girl error:', err);
    res.status(500).json({ error: 'Failed to create girl' });
  }
};

export const updateGirl = async (req, res) => {
  try {
    const girl = await Girl.findByIdAndUpdate(req.params.id, req.body, { 
      new: true, runValidators: true 
    });
    if (!girl) return res.status(404).json({ error: 'Not found' });
    res.json({ girl });
  } catch (err) {
    console.error('Update girl error:', err);
    res.status(500).json({ error: 'Failed to update girl' });
  }
};

export const deleteGirl = async (req, res) => {
  try {
    const girl = await Girl.findByIdAndDelete(req.params.id);
    if (!girl) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete girl error:', err);
    res.status(500).json({ error: 'Failed to delete girl' });
  }
};