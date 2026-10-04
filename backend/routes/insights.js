const express = require('express');
const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');
const User = require('../models/User');

const router = express.Router();

router.get('/savings', async (req, res, next) => {
  try {
    const { user_id } = req.query;
    if (!mongoose.isValidObjectId(user_id) || !(await User.exists({ _id: user_id }))) return res.status(400).json({ error: 'A valid user_id is required' });
    const recipes = await Recipe.find({ user_id, total_supermarket_cost: { $ne: null } })
      .select('title total_estimated_cost total_supermarket_cost createdAt')
      .sort({ createdAt: -1 });
    const rows = recipes.map((recipe) => ({
      recipe_id: recipe._id,
      title: recipe.title,
      palengke_estimate: recipe.total_estimated_cost,
      supermarket_estimate: recipe.total_supermarket_cost,
      estimated_savings: Math.max(0, recipe.total_supermarket_cost - recipe.total_estimated_cost),
      created_at: recipe.createdAt,
    }));
    const total = rows.reduce((sum, row) => sum + row.estimated_savings, 0);
    const recent = rows.filter((row) => new Date(row.created_at).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000);
    res.json({
      basis: 'saved_recipe_estimates',
      total_estimated_savings: Math.round(total * 100) / 100,
      recent_estimated_savings: Math.round(recent.reduce((sum, row) => sum + row.estimated_savings, 0) * 100) / 100,
      recipe_count: rows.length,
      recipes: rows,
    });
  } catch (err) { next(err); }
});

module.exports = router;
