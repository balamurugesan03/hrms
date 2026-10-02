const paginate = async (model, query = {}, options = {}) => {
  const {
    page = 1,
    limit = 10,
    sort = { createdAt: -1 },
    populate = '',
    select = '',
  } = options;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await model.countDocuments(query);

  let queryBuilder = model.find(query).sort(sort).skip(skip).limit(parseInt(limit));

  if (populate) queryBuilder = queryBuilder.populate(populate);
  if (select) queryBuilder = queryBuilder.select(select);

  const docs = await queryBuilder;

  return {
    docs,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
      hasPrevPage: parseInt(page) > 1,
    },
  };
};

const buildSearchQuery = (searchFields, searchTerm) => {
  if (!searchTerm) return {};
  const regex = new RegExp(searchTerm, 'i');
  return { $or: searchFields.map((field) => ({ [field]: regex })) };
};

module.exports = { paginate, buildSearchQuery };
