-- 为 username 添加唯一约束
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- 更新 handle_new_user 函数，确保生成的用户名唯一
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  random_name TEXT;
  name_exists BOOLEAN;
  attempt_count INTEGER := 0;
  max_attempts INTEGER := 10;
BEGIN
  LOOP
    -- 生成随机名称：形容词 + 名词 + 随机数字
    random_name := (
      SELECT adj || noun || floor(random() * 10000)::text
      FROM (
        SELECT (ARRAY['Happy', 'Brave', 'Clever', 'Cute', 'Mystic', 'Shiny', 'Flying', 'Swift', 'Smiling', 'Silent'])[floor(random() * 10 + 1)] as adj,
               (ARRAY['Cat', 'Dog', 'Bunny', 'Panda', 'Tiger', 'Fox', 'Dragon', 'Phoenix', 'Unicorn', 'Elf'])[floor(random() * 10 + 1)] as noun
      ) AS t
    );
    
    -- 检查名称是否已存在
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = random_name) INTO name_exists;
    
    -- 如果不存在或达到最大尝试次数，退出循环
    EXIT WHEN NOT name_exists OR attempt_count >= max_attempts;
    
    attempt_count := attempt_count + 1;
  END LOOP;
  
  -- 如果所有尝试都失败，添加 UUID 后缀确保唯一
  IF name_exists THEN
    random_name := random_name || '_' || substr(NEW.id::text, 1, 8);
  END IF;
  
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, random_name);
  
  RETURN NEW;
END;
$$;