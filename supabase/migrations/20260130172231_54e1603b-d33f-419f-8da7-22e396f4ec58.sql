-- 创建 profiles 表存储用户名
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建好友关系状态枚举
CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked');

-- 创建 friendships 表
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status friendship_status NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- 启用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Profiles RLS 策略
-- 所有人可以查看 profiles（用于搜索好友）
CREATE POLICY "Anyone can view profiles"
ON public.profiles FOR SELECT
USING (true);

-- 用户只能创建自己的 profile
CREATE POLICY "Users can create own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 用户只能更新自己的 profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Friendships RLS 策略
-- 用户只能查看自己参与的好友关系
CREATE POLICY "Users can view own friendships"
ON public.friendships FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 用户可以发起好友请求
CREATE POLICY "Users can send friend requests"
ON public.friendships FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- 用户可以更新自己参与的好友关系（接受/拒绝）
CREATE POLICY "Users can manage own friendships"
ON public.friendships FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 用户可以删除自己发起的好友请求
CREATE POLICY "Users can delete own friend requests"
ON public.friendships FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 创建更新时间戳触发器
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 创建自动创建 profile 的触发器（当用户注册时）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  random_name TEXT;
BEGIN
  -- 生成随机名称：形容词 + 名词 + 随机数字
  random_name := (
    SELECT adj || noun || floor(random() * 1000)::text
    FROM (
      SELECT (ARRAY['快乐的', '勇敢的', '聪明的', '可爱的', '神秘的', '闪亮的', '飞翔的', '奔跑的', '微笑的', '沉默的'])[floor(random() * 10 + 1)] as adj,
             (ARRAY['小猫', '小狗', '兔子', '熊猫', '老虎', '狐狸', '龙', '凤凰', '独角兽', '精灵'])[floor(random() * 10 + 1)] as noun
    ) AS t
  );
  
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, random_name);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 创建索引优化搜索
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX idx_friendships_status ON public.friendships(status);