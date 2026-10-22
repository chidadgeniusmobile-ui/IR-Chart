
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://nnxuyssumyggfjophcdi.supabase.co';
const supabaseKey = 'sb_publishable_j5cnof-l4P4Dudy5tmvdgQ_6-O__ur0';

export const supabase = createClient(supabaseUrl, supabaseKey);
