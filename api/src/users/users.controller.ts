import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAll() {
    const usuarios = await this.usersService.findAll();
    return { usuarios };
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const usuario = await this.usersService.create(createUserDto);
    return {
      message: 'Usuário criado com sucesso',
      usuario,
    };
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const usuario = await this.usersService.update(id, updateUserDto);
    return {
      message: 'Usuário atualizado com sucesso',
      usuario,
    };
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.usersService.remove(id, req.user.id);
  }

  @Get(':id/aprovacoes')
  async getUserAprovacoes(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserAprovacoes(id);
  }
}
