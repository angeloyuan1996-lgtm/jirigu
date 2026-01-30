-- 创建通关记录表
CREATE TABLE public.level_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, level_number)
);

-- 启用 RLS
ALTER TABLE public.level_completions ENABLE ROW LEVEL SECURITY;

-- 所有人可以查看通关记录（用于显示好友通关次数）
CREATE POLICY "Anyone can view completions"
ON public.level_completions FOR SELECT
USING (true);

-- 用户只能插入自己的通关记录
CREATE POLICY "Users can insert own completions"
ON public.level_completions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 创建索引
CREATE INDEX idx_level_completions_user_id ON public.level_completions(user_id);

-- 创建函数获取用户通关次数
CREATE OR REPLACE FUNCTION public.get_completion_count(target_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.level_completions
  WHERE user_id = target_user_id
$$;