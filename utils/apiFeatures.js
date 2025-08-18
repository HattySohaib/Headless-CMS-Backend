// utils/apiFeatures.js
class APIFeatures {
  constructor(query, queryString) {
    // query = the Mongoose query object (e.g., Blog.find())
    // queryString = the Express req.query object (e.g., { status: 'published', sort: '-createdAt' })
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // Step 1: Copy req.query into a new object so we can modify it without side effects
    const queryObj = { ...this.queryString };

    // Step 2: Fields to exclude (special params used for sorting, pagination, etc.)
    const excludedFields = [
      "page",
      "sort",
      "limit",
      "fields",
      "search",
      "searchFields",
    ];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Step 3: Convert advanced filters like price[gte]=100 into MongoDB syntax { price: { $gte: 100 } }
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    // Step 4: Apply basic filtering to the Mongoose query
    this.query = this.query.find(JSON.parse(queryStr));

    // We don't handle search here anymore, as it's now done in the separate search method

    return this; // return the object so we can chain other methods
  }

  sort() {
    if (this.queryString.sort) {
      // Multiple sort criteria: sort=price,-ratings → "price -ratings"
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      // Default sort (newest updated first)
      this.query = this.query.sort("-updatedAt");
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      // Select specific fields: fields=name,price → "name price"
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      // By default exclude MongoDB internal field
      this.query = this.query.select("-__v");
    }
    return this;
  }

  paginate() {
    const page = parseInt(this.queryString.page) || 1;
    const limit = parseInt(this.queryString.limit) || 10;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

  /**
   * Advanced search functionality that allows searching across multiple fields
   * @param {Array} fields - Array of field names to search in
   * @returns {APIFeatures} - The APIFeatures instance for method chaining
   */
  search(fields = ["title"]) {
    if (this.queryString.search) {
      const searchTerm = this.queryString.search;

      // Create an array of search conditions for each field
      const searchConditions = fields.map((field) => ({
        [field]: { $regex: searchTerm, $options: "i" },
      }));

      // Use $or operator to match any of the conditions
      this.query = this.query.find({
        $or: searchConditions,
      });
    }
    return this;
  }
}

export default APIFeatures;
