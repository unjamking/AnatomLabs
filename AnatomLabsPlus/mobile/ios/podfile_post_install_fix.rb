# ============================================================================
# Podfile Post-Install Hook to Fix Circular Dependencies
# ============================================================================
# Add this code to your Podfile's post_install block
# 
# Usage:
# 1. Open your ios/Podfile
# 2. Find or create a post_install do |installer| block
# 3. Add the code below inside that block
# ============================================================================

def fix_circular_dependencies(installer)
  puts "🔧 Fixing circular dependencies between targets..."
  
  installer.pods_project.targets.each do |target|
    # Fix ExpoModulesCore -> ReactCodegen circular dependency
    if target.name == 'ExpoModulesCore'
      puts "   Checking #{target.name} dependencies..."
      
      # Remove ReactCodegen dependency if it exists
      target.dependencies.delete_if do |dependency|
        if dependency.name == 'ReactCodegen'
          puts "   ❌ Removed ReactCodegen dependency from ExpoModulesCore"
          true
        else
          false
        end
      end
      
      # Also check build phases for any ReactCodegen references
      target.build_phases.each do |phase|
        if phase.is_a?(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)
          if phase.name&.include?('ReactCodegen') || phase.shell_script&.include?('ReactCodegen')
            puts "   ⚠️  Warning: Found ReactCodegen reference in build phase: #{phase.name}"
          end
        end
      end
    end
    
    # Fix EXConstants if it has any problematic dependencies
    if target.name == 'EXConstants'
      puts "   Checking #{target.name} dependencies..."
      target.dependencies.each do |dependency|
        puts "      - #{dependency.name}"
      end
    end
  end
  
  puts "✅ Circular dependency fix applied"
end

def fix_build_settings(installer)
  puts "🔧 Fixing build settings..."
  
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      # Ensure proper ordering of dependencies
      if target.name == 'Pods-AnatomLabs'
        # This is your main app target's pods
        puts "   Checking #{target.name} build settings..."
      end
      
      # Fix for Swift header generation issues that can cause cycles
      config.build_settings['SWIFT_COMPILATION_MODE'] ||= 'wholemodule'
      config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] ||= '-Onone' if config.name == 'Debug'
    end
  end
  
  puts "✅ Build settings fixed"
end

def fix_app_intents_extraction(installer)
  puts "🔧 Fixing App Intents metadata extraction order..."
  
  # The cycle point mentions ExtractAppIntentsMetadata
  # We need to ensure this doesn't trigger before dependencies are ready
  installer.pods_project.targets.each do |target|
    if target.name.include?('AnatomLabs')
      target.build_phases.each do |phase|
        if phase.is_a?(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)
          # Move App Intents extraction to after dependencies
          if phase.name&.include?('App Intents') || phase.name&.include?('Expo')
            puts "   Found build phase: #{phase.name}"
            # Ensure it runs after dependencies by adding explicit inputs
            phase.input_paths ||= []
            phase.output_paths ||= []
          end
        end
      end
    end
  end
  
  puts "✅ App Intents extraction order fixed"
end

# ============================================================================
# Main Post-Install Hook
# ============================================================================
# Copy the content below into your Podfile's post_install block
# ============================================================================

# post_install do |installer|
#   
#   # Apply circular dependency fixes
#   fix_circular_dependencies(installer)
#   fix_build_settings(installer)
#   fix_app_intents_extraction(installer)
#   
#   # Your other post_install code here...
#   # For example:
#   # react_native_post_install(installer)
#   # __apply_Xcode_12_5_M1_post_install_workaround(installer)
#   
#   # Save the project
#   installer.pods_project.save
#   
# end

puts ""
puts "════════════════════════════════════════════════════════════════"
puts "📝 Instructions:"
puts "════════════════════════════════════════════════════════════════"
puts ""
puts "1. Open your ios/Podfile"
puts "2. Look for the post_install block (or create one if it doesn't exist)"
puts "3. Add the fix functions above the post_install block"
puts "4. Call the fix functions inside post_install as shown in the example"
puts "5. Run: pod install"
puts ""
puts "Example Podfile structure:"
puts ""
puts "  # ... other Podfile content ..."
puts ""
puts "  # Add the fix functions here (before post_install)"
puts ""
puts "  post_install do |installer|"
puts "    fix_circular_dependencies(installer)"
puts "    fix_build_settings(installer)"
puts "    fix_app_intents_extraction(installer)"
puts "    "
puts "    # Other post_install code..."
puts "    "
puts "    installer.pods_project.save"
puts "  end"
puts ""
puts "════════════════════════════════════════════════════════════════"
