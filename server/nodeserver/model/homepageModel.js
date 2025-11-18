import mongoose from 'mongoose';

// Homepage section schema
const homepageSectionSchema = new mongoose.Schema({
    section: {
        type: String,
        required: true,
        unique: true,
        enum: ['hero', 'impact', 'features', 'guidance', 'testimonials']
    },
    title: {
        type: String,
        required: true
    },
    subtitle: {
        type: String,
        default: ''
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    order: {
        type: Number,
        required: true,
        min: 1
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient querying
homepageSectionSchema.index({ order: 1 });
homepageSectionSchema.index({ isActive: 1 });

// Update the updatedAt field before saving
homepageSectionSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Static method to get all active sections ordered
homepageSectionSchema.statics.getActiveSections = function() {
    return this.find({ isActive: true }).sort({ order: 1 });
};

// Static method to get homepage data in the required format
homepageSectionSchema.statics.getHomepageData = async function() {
    try {
        const sections = await this.getActiveSections();
        
        // Process sections to limit testimonials and format numeric stats with a trailing "+"
        const processedSections = sections.map(section => {
            const obj = section.toObject();

            // Testimonials: cap to 50 random entries
            if (obj.section === 'testimonials' && obj.data && Array.isArray(obj.data.testimonials)) {
                const testimonials = obj.data.testimonials;
                if (testimonials.length > 50) {
                    const shuffled = [...testimonials].sort(() => 0.5 - Math.random());
                    obj.data.testimonials = shuffled.slice(0, 50);
                }
            }

            // Format numeric stats: append "+" and locale-format numbers
            if (obj.data && Array.isArray(obj.data.stats)) {
                obj.data.stats = obj.data.stats.map((s) => {
                    if (s && typeof s.value === 'number') {
                        return { ...s, value: s.value.toLocaleString() + '+' };
                    }
                    return s;
                });
            }

            return obj;
        });
        
        return {
            success: true,
            data: processedSections
        };
    } catch (error) {
        throw new Error(`Failed to fetch homepage data: ${error.message}`);
    }
};

// Increment "Successful Reunions" stat value on impact section (upsert if missing)
homepageSectionSchema.statics.incrementReunionsCount = async function(delta = 1) {
  // Try to increment the numeric value of the stat with label matching "Successful Reunions"
  const result = await this.updateOne(
    { section: 'impact' },
    { $inc: { 'data.stats.$[elem].value': delta } },
    { arrayFilters: [ { 'elem.label': { $regex: /^\s*Successful Reunions\s*$/i } } ] }
  );

  // If no document was updated, create impact with a default stats array including successful reunions
  if (result.matchedCount === 0) {
    await this.updateOne(
      { section: 'impact' },
      {
        $setOnInsert: {
          title: 'Our Impact',
          subtitle: '',
          order: 2,
          isActive: true,
          'data.stats': [
            { label: 'Cases Registered', value: 0 },
            { label: 'Successful Reunions', value: Math.max(0, delta) },
            { label: 'Worldwide Coverage', value: 'Global' }
          ]
        }
      },
      { upsert: true }
    );
  }
};

// Increment "Cases Registered" stat value on impact section (upsert if missing)
homepageSectionSchema.statics.incrementCasesRegistered = async function(delta = 1) {
  const result = await this.updateOne(
    { section: 'impact' },
    { $inc: { 'data.stats.$[elem].value': delta } },
    { arrayFilters: [ { 'elem.label': { $regex: /^\s*Cases Registered\s*$/i } } ] }
  );

  if (result.matchedCount === 0) {
    await this.updateOne(
      { section: 'impact' },
      {
        $setOnInsert: {
          title: 'Our Impact',
          subtitle: '',
          order: 2,
          isActive: true,
          'data.stats': [
            { label: 'Cases Registered', value: Math.max(0, delta) },
            { label: 'Successful Reunions', value: 0 },
            { label: 'Worldwide Coverage', value: 'Global' }
          ]
        }
      },
      { upsert: true }
    );
  }
};


const HomepageSection = mongoose.model('HomepageSection', homepageSectionSchema);

export default HomepageSection;