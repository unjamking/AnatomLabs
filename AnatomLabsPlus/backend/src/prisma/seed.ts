/**
 * Database Seed Script
 * 
 * Populates database with:
 * - Body parts (muscles, organs) with educational content
 * - Exercises with biomechanics explanations
 * - Foods with nutrition data
 * - Sample user for testing
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clear existing data (in order due to foreign keys)
  console.log('🗑️  Clearing existing data...');
  await prisma.exerciseBodyPart.deleteMany();
  await prisma.workoutExercise.deleteMany();
  await prisma.workout.deleteMany();
  await prisma.workoutPlan.deleteMany();
  await prisma.mealPresetItem.deleteMany();
  await prisma.mealPreset.deleteMany();
  await prisma.nutritionLog.deleteMany();
  await prisma.weightLog.deleteMany();
  await prisma.userStreak.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.muscleUsageLog.deleteMany();
  await prisma.report.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.food.deleteMany();
  await prisma.bodyPart.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Existing data cleared\n');

  // 1. Load and seed body parts
  console.log('📚 Seeding body parts...');
  const bodyPartsPath = path.join(__dirname, '../../../tools/sample-data/bodyParts.json');
  const bodyPartsData = JSON.parse(fs.readFileSync(bodyPartsPath, 'utf-8'));
  
  const bodyPartMap = new Map<string, string>(); // name -> id
  
  for (const bodyPart of bodyPartsData) {
    const created = await prisma.bodyPart.create({
      data: {
        name: bodyPart.name,
        type: bodyPart.type,
        category: bodyPart.category,
        description: bodyPart.description,
        function: bodyPart.function,
        importance: bodyPart.importance,
        movement: bodyPart.movement,
        modelLayer: bodyPart.modelLayer,
        position3D: bodyPart.position3D,
        recoveryTime: bodyPart.recoveryTime
      }
    });
    bodyPartMap.set(bodyPart.name, created.id);
  }
  console.log(`✅ Created ${bodyPartsData.length} body parts\n`);

  // 2. Load and seed exercises
  console.log('💪 Seeding exercises...');
  const exercisesPath = path.join(__dirname, '../../../tools/sample-data/exercises.json');
  const exercisesData = JSON.parse(fs.readFileSync(exercisesPath, 'utf-8'));
  
  for (const exercise of exercisesData) {
    const created = await prisma.exercise.create({
      data: {
        name: exercise.name,
        category: exercise.category,
        difficulty: exercise.difficulty,
        equipment: exercise.equipment,
        description: exercise.description,
        instructions: exercise.instructions,
        sportTags: exercise.sportTags,
        mechanicalLoad: exercise.mechanicalLoad,
        jointInvolvement: exercise.jointInvolvement
      }
    });

    // Create exercise-bodypart relationships
    if (exercise.primaryMuscles) {
      for (const muscleRelation of exercise.primaryMuscles) {
        const bodyPartId = bodyPartMap.get(muscleRelation.muscle);
        if (bodyPartId) {
          await prisma.exerciseBodyPart.create({
            data: {
              exerciseId: created.id,
              bodyPartId: bodyPartId,
              activationRank: muscleRelation.activationRank,
              activationRanking: muscleRelation.activationRank,
              activationDescription: muscleRelation.explanation
            }
          });
        }
      }
    }
  }
  console.log(`✅ Created ${exercisesData.length} exercises with muscle activation data\n`);

  // 3. Load and seed foods from JSON file
  console.log('🍎 Seeding foods...');
  const foodsPath = path.join(__dirname, '../../../tools/sample-data/foods.json');
  const foodsData = JSON.parse(fs.readFileSync(foodsPath, 'utf-8'));

  for (const food of foodsData) {
    await prisma.food.create({
      data: {
        name: food.name,
        category: food.category,
        servingSize: food.servingSize,
        servingUnit: food.servingUnit,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber || null,
        sugar: food.sugar || null
      }
    });
  }
  console.log(`✅ Created ${foodsData.length} foods\n`);

  // 4. Create sample user
  console.log('👤 Creating sample user...');
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.create({
    data: {
      email: 'demo@anatomlabs.com',
      password: hashedPassword,
      name: 'Demo User',
      age: 25,
      gender: 'male',
      weight: 75,
      height: 180,
      activityLevel: 'moderate',
      fitnessGoal: 'muscle_gain',
      goal: 'muscle_gain',
      experienceLevel: 'intermediate'
    }
  });
  console.log(`✅ Created demo user (email: demo@anatomlabs.com, password: password123)\n`);

  console.log('🔑 Creating admin user...');
  const adminHashedPassword = await bcrypt.hash('AlexNo11@23$9', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'basicallyalex1@gmail.com' },
    update: { isAdmin: true },
    create: {
      email: 'basicallyalex1@gmail.com',
      password: adminHashedPassword,
      name: 'Alex',
      age: 25,
      gender: 'male',
      weight: 75,
      height: 180,
      activityLevel: 'moderate',
      fitnessGoal: 'general_fitness',
      goal: 'general_fitness',
      experienceLevel: 'advanced',
      isAdmin: true,
    }
  });
  console.log(`✅ Created admin user (email: basicallyalex1@gmail.com)\n`);

  // 5. Create sample activity log
  console.log('📊 Creating sample data for demo user...');
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      date: new Date(),
      steps: 8500,
      distance: 6.8,
      activeMinutes: 45,
      caloriesBurned: 320
    }
  });
  console.log('✅ Created sample activity log\n');

  console.log('🎉 Database seeding completed successfully!\n');
  console.log('📝 Summary:');
  console.log(`   - Body Parts: ${bodyPartsData.length} (muscles, organs)`);
  console.log(`   - Exercises: ${exercisesData.length} (with biomechanics)`);
  console.log(`   - Foods: ${foodsData.length}`);
  console.log(`   - Demo User: demo@anatomlabs.com`);
  console.log('\n🚀 Ready to start the server!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
